import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { task } from "@trigger.dev/sdk";

import { prisma } from "../../lib/prisma";

type TaskNodeContext = {
  workflowRunId: string;
  nodeId: string;
};

async function updateNodeRunSuccess(
  context: TaskNodeContext,
  output: string,
  executionTime: number,
) {
  await prisma.nodeRun.updateMany({
    where: {
      workflowRunId: context.workflowRunId,
      nodeId: context.nodeId,
    },
    data: {
      status: "SUCCESS",
      outputGenerated: output,
      executionTime,
      error: null,
    },
  });
}

async function updateNodeRunFailure(
  context: TaskNodeContext,
  error: unknown,
  executionTime: number,
) {
  await prisma.nodeRun.updateMany({
    where: {
      workflowRunId: context.workflowRunId,
      nodeId: context.nodeId,
    },
    data: {
      status: "FAILED",
      executionTime,
      error: error instanceof Error ? error.message : "Unknown task error",
    },
  });
}

function getFileExtensionFromUrl(url: string, fallback: string) {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split(".").pop();
    if (ext && ext.length <= 5) {
      return ext.toLowerCase();
    }
  } catch {
    return fallback;
  }

  return fallback;
}

async function downloadToTempFile(url: string, extension: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to download media: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const tempFile = join(
    tmpdir(),
    `nextflow-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`,
  );
  await fs.writeFile(tempFile, buffer);
  return tempFile;
}

function runCommand(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code ${code}: ${stderr}`));
    });
  });
}

async function getVideoDurationInSeconds(filePath: string) {
  return new Promise<number>((resolve, reject) => {
    const args = [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=nokey=1:noprint_wrappers=1",
      filePath,
    ];

    const child = spawn("ffprobe", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed with code ${code}: ${stderr}`));
        return;
      }

      const duration = Number.parseFloat(stdout.trim());
      if (!Number.isFinite(duration)) {
        reject(new Error("Unable to parse video duration"));
        return;
      }

      resolve(duration);
    });
  });
}

function createTransloaditSignature(params: string) {
  const secret = process.env.TRANSLOADIT_AUTH_SECRET;
  if (!secret) {
    return null;
  }

  const digest = createHmac("sha384", secret).update(params).digest("hex");
  return `sha384:${digest}`;
}

async function uploadFileToTransloadit(filePath: string, contentType: string) {
  const authKey = process.env.TRANSLOADIT_AUTH_KEY;
  if (!authKey) {
    throw new Error("TRANSLOADIT_AUTH_KEY is missing");
  }

  const params = JSON.stringify({
    auth: { key: authKey },
    steps: {
      ":original": {
        robot: "/upload/handle",
      },
    },
  });

  const signature = createTransloaditSignature(params);

  const formData = new FormData();
  formData.append("params", params);
  if (signature) {
    formData.append("signature", signature);
  }

  const fileBuffer = await fs.readFile(filePath);
  formData.append(
    "file",
    new Blob([fileBuffer], { type: contentType }),
    "asset.bin",
  );

  const response = await fetch("https://api2.transloadit.com/assemblies", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Transloadit upload failed: ${response.status}`);
  }

  const assembly = (await response.json()) as {
    assembly_id?: string;
    ok?: string;
    uploads?: Array<{ ssl_url?: string; url?: string }>;
    assembly_ssl_url?: string;
    error?: string;
  };

  if (assembly.ok === "ASSEMBLY_COMPLETED") {
    const directUrl =
      assembly.uploads?.[0]?.ssl_url ?? assembly.uploads?.[0]?.url;
    if (directUrl) {
      return directUrl;
    }
  }

  if (!assembly.assembly_id) {
    throw new Error(
      assembly.error ?? "Transloadit did not return an assembly id",
    );
  }

  const statusUrl = `https://api2.transloadit.com/assemblies/${assembly.assembly_id}`;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const statusResponse = await fetch(statusUrl);
    if (!statusResponse.ok) {
      throw new Error(
        `Transloadit status check failed: ${statusResponse.status}`,
      );
    }

    const statusJson = (await statusResponse.json()) as {
      ok?: string;
      error?: string;
      uploads?: Array<{ ssl_url?: string; url?: string }>;
      results?: Record<string, Array<{ ssl_url?: string; url?: string }>>;
    };

    if (statusJson.ok === "ASSEMBLY_EXECUTING") {
      continue;
    }

    if (statusJson.ok === "ASSEMBLY_COMPLETED") {
      const resultGroups = statusJson.results
        ? Object.values(statusJson.results)
        : [];
      for (const group of resultGroups) {
        const url = group[0]?.ssl_url ?? group[0]?.url;
        if (url) {
          return url;
        }
      }

      const uploadUrl =
        statusJson.uploads?.[0]?.ssl_url ?? statusJson.uploads?.[0]?.url;
      if (uploadUrl) {
        return uploadUrl;
      }

      throw new Error("Transloadit completed but no output URL was returned");
    }

    throw new Error(statusJson.error ?? "Transloadit assembly failed");
  }

  throw new Error("Timed out waiting for Transloadit assembly completion");
}

function parseTimestampToSeconds(
  timestamp: string,
  videoDurationSeconds: number,
) {
  const trimmed = timestamp.trim();

  if (trimmed.endsWith("%")) {
    const percentage = Number.parseFloat(trimmed.slice(0, -1));
    if (!Number.isFinite(percentage)) {
      throw new Error("Invalid percentage timestamp value");
    }

    return Math.max((videoDurationSeconds * percentage) / 100, 0);
  }

  const seconds = Number.parseFloat(trimmed);
  if (!Number.isFinite(seconds)) {
    throw new Error("Invalid timestamp value");
  }

  return Math.max(seconds, 0);
}

export const llmTask = task({
  id: "llm-task",
  run: async (payload: {
    model: string;
    systemPrompt?: string;
    userMessage: string;
    imageUrls?: string[];
    workflowRunId: string;
    nodeId: string;
  }) => {
    const startedAt = Date.now();

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const requestedModel = payload.model?.trim();
      const defaultModel = "gemini-2.5-flash";
      const supportedModels = new Set([
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.5-pro",
        "gemini-2.0-flash",
      ]);
      const resolvedModel =
        requestedModel && supportedModels.has(requestedModel)
          ? requestedModel
          : defaultModel;
      const model = genAI.getGenerativeModel({ model: resolvedModel });

      const imageParts = await Promise.all(
        (payload.imageUrls ?? []).map(async (url) => {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Unable to fetch image: ${response.status}`);
          }

          const bytes = Buffer.from(await response.arrayBuffer()).toString(
            "base64",
          );
          const mimeType = response.headers.get("content-type") ?? "image/jpeg";

          return {
            inlineData: {
              data: bytes,
              mimeType,
            },
          };
        }),
      );

      const promptText = payload.systemPrompt?.trim()
        ? `${payload.systemPrompt.trim()}\n\n${payload.userMessage}`
        : payload.userMessage;

      const result = await model.generateContent([promptText, ...imageParts]);
      const output = result.response.text();

      await updateNodeRunSuccess(
        {
          workflowRunId: payload.workflowRunId,
          nodeId: payload.nodeId,
        },
        output,
        Date.now() - startedAt,
      );

      return { output };
    } catch (error) {
      await updateNodeRunFailure(
        {
          workflowRunId: payload.workflowRunId,
          nodeId: payload.nodeId,
        },
        error,
        Date.now() - startedAt,
      );
      throw error;
    }
  },
});

export const cropImageTask = task({
  id: "crop-image-task",
  run: async (payload: {
    imageUrl: string;
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
    workflowRunId: string;
    nodeId: string;
  }) => {
    const startedAt = Date.now();
    let inputPath: string | null = null;
    let outputPath: string | null = null;

    try {
      const inputExt = getFileExtensionFromUrl(payload.imageUrl, "jpg");
      inputPath = await downloadToTempFile(payload.imageUrl, inputExt);
      outputPath = join(
        tmpdir(),
        `nextflow-cropped-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`,
      );

      const cropFilter = `crop=iw*(${payload.widthPercent}/100):ih*(${payload.heightPercent}/100):iw*(${payload.xPercent}/100):ih*(${payload.yPercent}/100)`;

      await runCommand("ffmpeg", [
        "-y",
        "-i",
        inputPath,
        "-vf",
        cropFilter,
        outputPath,
      ]);

      const output = await uploadFileToTransloadit(outputPath, "image/jpeg");

      await updateNodeRunSuccess(
        {
          workflowRunId: payload.workflowRunId,
          nodeId: payload.nodeId,
        },
        output,
        Date.now() - startedAt,
      );

      return { output };
    } catch (error) {
      await updateNodeRunFailure(
        {
          workflowRunId: payload.workflowRunId,
          nodeId: payload.nodeId,
        },
        error,
        Date.now() - startedAt,
      );
      throw error;
    } finally {
      if (inputPath) {
        await fs.unlink(inputPath).catch(() => undefined);
      }
      if (outputPath) {
        await fs.unlink(outputPath).catch(() => undefined);
      }
    }
  },
});

export const extractFrameTask = task({
  id: "extract-frame-task",
  run: async (payload: {
    videoUrl: string;
    timestamp: string;
    workflowRunId: string;
    nodeId: string;
  }) => {
    const startedAt = Date.now();
    let videoPath: string | null = null;
    let framePath: string | null = null;

    try {
      const inputExt = getFileExtensionFromUrl(payload.videoUrl, "mp4");
      videoPath = await downloadToTempFile(payload.videoUrl, inputExt);
      framePath = join(
        tmpdir(),
        `nextflow-frame-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`,
      );

      const duration = await getVideoDurationInSeconds(videoPath);
      const timestampSeconds = parseTimestampToSeconds(
        payload.timestamp,
        duration,
      );

      await runCommand("ffmpeg", [
        "-y",
        "-ss",
        String(timestampSeconds),
        "-i",
        videoPath,
        "-vframes",
        "1",
        framePath,
      ]);

      const output = await uploadFileToTransloadit(framePath, "image/jpeg");

      await updateNodeRunSuccess(
        {
          workflowRunId: payload.workflowRunId,
          nodeId: payload.nodeId,
        },
        output,
        Date.now() - startedAt,
      );

      return { output };
    } catch (error) {
      await updateNodeRunFailure(
        {
          workflowRunId: payload.workflowRunId,
          nodeId: payload.nodeId,
        },
        error,
        Date.now() - startedAt,
      );
      throw error;
    } finally {
      if (videoPath) {
        await fs.unlink(videoPath).catch(() => undefined);
      }
      if (framePath) {
        await fs.unlink(framePath).catch(() => undefined);
      }
    }
  },
});
