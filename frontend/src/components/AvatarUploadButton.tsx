import { useRef, useState, ChangeEvent } from "react";
import { Camera, Loader2 } from "lucide-react";
import { PersonAvatar } from "./ui/Avatar";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { uploadAvatar } from "../services/auth.service";
import { getErrorMessage } from "../services/api";

/** Click-to-change profile photo — available to every logged-in role. */
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
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="group relative shrink-0 rounded-full"
      title="Change profile photo"
    >
      <PersonAvatar tone={tone} className={size} ringed={ringed} src={user?.avatarUrl} />
      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/40 group-hover:opacity-100">
        {uploading ? (
          <Loader2 className="h-1/2 w-1/2 animate-spin text-white" />
        ) : (
          <Camera className="h-1/2 w-1/2 text-white" />
        )}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </button>
  );
}
