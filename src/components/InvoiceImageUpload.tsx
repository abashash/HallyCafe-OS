import { useRef, useState, type DragEvent } from "react";
import { ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PickedImage = { file: File; url: string };

export function InvoiceImageUpload({
  images,
  onChange,
}: {
  images: PickedImage[];
  onChange: (next: PickedImage[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function addFiles(files: FileList | File[]) {
    const picked = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ file, url: URL.createObjectURL(file) }));
    if (picked.length) onChange([...images, ...picked]);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  function removeAt(idx: number) {
    const target = images[idx];
    if (target) URL.revokeObjectURL(target.url);
    onChange(images.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/60",
        )}
      >
        <ImagePlus className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium">تصویر فاکتور را اینجا رها کنید</p>
        <p className="text-xs text-muted-foreground">
          یا برای انتخاب فایل کلیک کنید (چند تصویر مجاز است)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img, idx) => (
            <div key={img.url} className="relative overflow-hidden rounded-lg border border-border">
              <img
                src={img.url}
                alt={`تصویر فاکتور ${idx + 1}`}
                className="h-24 w-full object-cover"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute left-1 top-1 size-6"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(idx);
                }}
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
