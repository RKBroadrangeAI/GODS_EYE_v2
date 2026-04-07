import Image from "next/image";
import { getBrandIcon, getBrandImagePath } from "@/lib/brand-icons";

export function BrandIcon({
  name,
  size = 16,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const src = getBrandImagePath(name);
  if (!src) {
    return <span className={className}>{getBrandIcon(name)}</span>;
  }
  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      className={`inline-block object-contain ${className}`}
      unoptimized
    />
  );
}
