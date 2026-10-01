import Image from "next/image";
import { mediaSrc, titleOf, type Photo as PhotoData } from "@/lib/catalog";

type Props = {
  photo: PhotoData;
  sizes: string;
  className?: string;
  priority?: boolean;
  fill?: boolean;
};

/** Image du catalogue : variantes WebP pré-générées, couleur dominante en attendant le chargement. */
export function Photo({ photo, sizes, className = "", priority, fill }: Props) {
  return (
    <Image
      src={mediaSrc(photo)}
      alt={photoAlt(photo)}
      sizes={sizes}
      priority={priority}
      draggable={false}
      style={{ backgroundColor: photo.color }}
      className={`select-none ${className}`}
      {...(fill ? { fill: true } : { width: photo.width, height: photo.height })}
    />
  );
}

export function photoAlt(photo: PhotoData) {
  const title = titleOf(photo);
  return photo.place ? `${title}, ${photo.place}` : title;
}
