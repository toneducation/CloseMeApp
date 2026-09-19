import { useEffect, useState } from "react";
import { photoUrl } from "@/lib/photos";
import { cn } from "@/lib/utils";

export function Photo({
  path,
  name,
  className,
}: {
  path: string | null;
  name: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    setUrl(null);
    photoUrl(path)
      .then((next) => active && setUrl(next))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [path]);

  if (!url || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-secondary text-secondary-foreground",
          className,
        )}
        aria-label={`${name} has no photo`}
        role="img"
      >
        <span className="font-display text-4xl opacity-60">{name.slice(0, 1).toUpperCase()}</span>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={`Photo of ${name}`}
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
    />
  );
}
