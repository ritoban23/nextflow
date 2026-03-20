"use client";

import { useEffect, useRef, useState } from "react";
import { Video } from "lucide-react";
import { Handle, Position, type NodeProps } from "reactflow";

import { useWorkflowStore } from "@/lib/store";

type UploadVideoNodeData = {
  videoUrl?: string;
  uploading?: boolean;
  error?: string;
};

type UppyLike = {
  addFile: (file: { name: string; type: string; data: File }) => unknown;
  close?: () => void;
};

const handleStyle = {
  height: 12,
  width: 12,
  border: "2px solid #c084fc",
  background: "#8b5cf6",
};

function getResultUrl(assembly: unknown): string | null {
  if (!assembly || typeof assembly !== "object") {
    return null;
  }

  const data = assembly as {
    results?: Record<string, Array<Record<string, unknown>>>;
    uploads?: Array<Record<string, unknown>>;
  };

  const resultGroups = data.results ? Object.values(data.results) : [];

  for (const group of resultGroups) {
    for (const item of group) {
      const maybeUrl =
        (typeof item.ssl_url === "string" && item.ssl_url) ||
        (typeof item.url === "string" && item.url) ||
        (typeof item.cdn_url === "string" && item.cdn_url) ||
        null;

      if (maybeUrl) {
        return maybeUrl;
      }
    }
  }

  const firstUpload = data.uploads?.[0];
  if (!firstUpload) {
    return null;
  }

  return (
    (typeof firstUpload.ssl_url === "string" && firstUpload.ssl_url) ||
    (typeof firstUpload.url === "string" && firstUpload.url) ||
    null
  );
}

export default function UploadVideoNode({ id, data }: NodeProps<UploadVideoNodeData>) {
  const updateNode = useWorkflowStore((state) => state.updateNode);
  const uppyRef = useRef<UppyLike | null>(null);
  const dataRef = useRef<UploadVideoNodeData>(data ?? {});
  const [uppyInstance, setUppyInstance] = useState<UppyLike | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const videoUrl = data?.videoUrl;
  const isUploading = Boolean(data?.uploading);

  useEffect(() => {
    dataRef.current = data ?? {};
  }, [data]);

  useEffect(() => {
    let disposed = false;

    const authKey = process.env.NEXT_PUBLIC_TRANSLOADIT_AUTH_KEY;
    if (!authKey) {
      setIsInitializing(false);
      return;
    }

    const initializeUploader = async () => {
      setIsInitializing(true);

      try {
        const [{ default: UppyCore }, { default: TransloaditPlugin }] =
          await Promise.all([import("@uppy/core"), import("@uppy/transloadit")]);

        if (disposed) {
          return;
        }

        const uppy = new UppyCore({
          autoProceed: true,
          restrictions: {
            maxNumberOfFiles: 1,
            allowedFileTypes: [".mp4", ".mov", ".webm", ".m4v"],
          },
        });

        uppy.use(TransloaditPlugin, {
          waitForEncoding: true,
          assemblyOptions: {
            params: {
              auth: { key: authKey },
              template_id: process.env.NEXT_PUBLIC_TRANSLOADIT_TEMPLATE_ID,
            },
          },
        });

        uppy.on("upload", () => {
          const latest = dataRef.current;
          updateNode(id, {
            data: {
              ...latest,
              uploading: true,
              error: undefined,
            },
          });
        });

        uppy.on("transloadit:complete", (assembly: unknown) => {
          const latest = dataRef.current;
          const url = getResultUrl(assembly);

          updateNode(id, {
            data: {
              ...latest,
              uploading: false,
              videoUrl: url ?? latest.videoUrl,
              error: url ? undefined : "Upload completed but no URL returned.",
            },
          });
        });

        uppy.on("upload-error", (_file: unknown, error: Error) => {
          const latest = dataRef.current;
          updateNode(id, {
            data: {
              ...latest,
              uploading: false,
              error: error.message,
            },
          });
        });

        uppyRef.current = uppy;
        setUppyInstance(uppy);
      } catch (error) {
        const latest = dataRef.current;

        updateNode(id, {
          data: {
            ...latest,
            uploading: false,
            error:
              error instanceof Error
                ? error.message
                : "Unable to initialize video uploader.",
          },
        });
      } finally {
        if (!disposed) {
          setIsInitializing(false);
        }
      }
    };

    void initializeUploader();

    return () => {
      disposed = true;
      uppyRef.current?.close?.();
      uppyRef.current = null;
      setUppyInstance(null);
    };
  }, [id, updateNode]);

  const handleFileChange = async (file: File | null) => {
    if (!file || !uppyInstance) {
      return;
    }

    try {
      await uppyInstance.addFile({
        name: file.name,
        type: file.type,
        data: file,
      });
    } catch (error) {
      const latest = dataRef.current;
      updateNode(id, {
        data: {
          ...latest,
          uploading: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to start video upload.",
        },
      });
    }
  };

  return (
    <div className="min-w-[280px] rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-3 text-zinc-100 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-200">
        <Video className="h-4 w-4 text-zinc-300" />
        <span>Upload Video</span>
      </div>

      {uppyInstance ? (
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800">
          <span>{isUploading ? "Uploading..." : "Choose video"}</span>
          <input
            type="file"
            className="hidden"
            accept=".mp4,.mov,.webm,.m4v"
            disabled={isUploading}
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              void handleFileChange(nextFile);
              event.currentTarget.value = "";
            }}
          />
        </label>
      ) : (
        <p className="text-xs text-zinc-400">
          {isInitializing ? "Initializing uploader..." : "Uploader unavailable."}
        </p>
      )}

      {videoUrl ? (
        <video
          src={videoUrl}
          controls
          className="mt-3 max-h-[220px] w-full rounded-md border border-zinc-700"
        />
      ) : null}

      {data?.error ? (
        <p className="mt-2 text-xs text-red-400">{data.error}</p>
      ) : null}

      <div className="mt-3 flex items-center justify-end gap-2 text-xs text-zinc-400">
        <span>videoUrl</span>
        <Handle
          id="videoUrl"
          type="source"
          position={Position.Right}
          style={handleStyle}
          className="node-handle"
        />
      </div>
    </div>
  );
}
