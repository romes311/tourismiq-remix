import { useState, useRef, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
import type { User } from "~/utils/auth.server";
import { cn } from "~/lib/utils";

interface ProfileImageProps {
  src: string;
  alt: string;
  isEditing?: boolean;
  className?: string;
  onImageUpdate?: (user: User) => void;
}

interface CropperRef extends HTMLImageElement {
  cropper: {
    getCroppedCanvas(): HTMLCanvasElement;
  };
}

interface FetcherData {
  success?: boolean;
  user?: User;
  error?: string;
}

export function ProfileImage({
  src,
  alt,
  isEditing = false,
  className = "",
  onImageUpdate,
}: ProfileImageProps) {
  const [showCropper, setShowCropper] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const cropperRef = useRef<CropperRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher<FetcherData>();

  // Handle server response
  useEffect(() => {
    if (fetcher.data?.success && fetcher.data.user && onImageUpdate) {
      onImageUpdate(fetcher.data.user);
    }
  }, [fetcher.data, onImageUpdate]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCrop = async () => {
    const imageElement = cropperRef?.current;
    if (imageElement?.cropper) {
      const croppedCanvas = imageElement.cropper.getCroppedCanvas();

      // Convert canvas to blob
      croppedCanvas.toBlob(async (blob) => {
        if (blob) {
          // Create form data
          const formData = new FormData();
          formData.append("avatar", blob, "avatar.png");

          // Upload the image
          fetcher.submit(formData, {
            method: "post",
            action: "/api/user/update-avatar",
            encType: "multipart/form-data",
          });

          setShowCropper(false);
          setImage(null);
        }
      }, "image/png");
    }
  };

  return (
    <>
      <div className="relative">
        <img
          src={src}
          alt={alt}
          className={cn(
            "object-cover",
            className
          )}
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        {isEditing && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-full"
            aria-label="Change profile picture"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
          aria-label="Upload profile picture"
        />
      </div>

      {showCropper && image && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 max-w-lg w-full">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Crop Profile Picture
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Drag to reposition and use the handles to resize.
              </p>
            </div>
            <div className="mb-4">
              <Cropper
                src={image}
                style={{ height: 300, width: "100%" }}
                aspectRatio={1}
                guides={false}
                ref={cropperRef}
                viewMode={1}
                dragMode="move"
                cropBoxMovable={true}
                cropBoxResizable={true}
                toggleDragModeOnDblclick={false}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCropper(false);
                  setImage(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCrop}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {fetcher.state === "submitting" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      )}

      {fetcher.data?.error && (
        <div className="absolute inset-x-0 -bottom-8 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">
            {fetcher.data.error}
          </p>
        </div>
      )}
    </>
  );
}
