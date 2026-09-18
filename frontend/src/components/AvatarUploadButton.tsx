import { useRef, useState, ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { Plus, Loader2, X } from "lucide-react";
import { PersonAvatar } from "./ui/Avatar";
import { AvatarCropModal } from "./AvatarCropModal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { uploadAvatar } from "../services/auth.service";
import { getErrorMessage } from "../services/api";

/**
 * Profile photo — clicking the photo itself opens a full-size preview; the small "+"
 * badge in the corner is the actual upload/change trigger, always visible (not just on hover).
 */
export function AvatarUploadButton({
  size = "h-9 w-9",
  tone = "brand",
  ringed = false,
}: {
  size?: string;
  tone?: "brand" | "gold" | "green" | "maroon";
  ringed?: boolean;
}) {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    // No fixed crop can center every photo's face — a close-up selfie and a
    // full-body shot need completely different crops — so the person picks
    // their own crop here instead of the app guessing one.
    setCropFile(file);
  }

  async function handleCropConfirm(blob: Blob) {
    setCropFile(null);
    setUploading(true);
    try {
      const updated = await uploadAvatar(blob);
      setUser(updated);
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div className={`relative shrink-0 ${size}`}>
        <button
          type="button"
          onClick={() => (user?.avatarUrl ? setPreviewOpen(true) : inputRef.current?.click())}
          className="block h-full w-full rounded-full"
          title={user?.avatarUrl ? "View profile photo" : "Add profile photo"}
        >
          <PersonAvatar tone={tone} className="h-full w-full" ringed={ringed} src={user?.avatarUrl} />
        </button>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          title="Change profile photo"
          className="absolute -bottom-0.5 -right-0.5 flex h-[45%] w-[45%] min-h-[16px] min-w-[16px] items-center justify-center rounded-full border-2 border-white bg-brand-800 text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          {uploading ? (
            <Loader2 className="h-2/3 w-2/3 animate-spin" />
          ) : (
            <Plus className="h-2/3 w-2/3" strokeWidth={3} />
          )}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {previewOpen &&
        user?.avatarUrl &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-950/80 p-4 backdrop-blur-sm"
            onClick={() => setPreviewOpen(false)}
          >
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={user.avatarUrl}
              alt="Profile photo"
              className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body
        )}

      {cropFile && <AvatarCropModal file={cropFile} onCancel={() => setCropFile(null)} onConfirm={handleCropConfirm} />}
    </>
  );
}
