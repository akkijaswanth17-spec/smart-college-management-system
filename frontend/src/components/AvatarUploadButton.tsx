import { useRef, useState, ChangeEvent } from "react";
import { Plus, Loader2, X } from "lucide-react";
import { PersonAvatar } from "./ui/Avatar";
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

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const updated = await uploadAvatar(file);
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

      {previewOpen && user?.avatarUrl && (
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
        </div>
      )}
    </>
  );
}
