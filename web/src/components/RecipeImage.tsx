type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
};

/** Local recipe photo with soft food-colored fallback. */
export function RecipeImage({ src, alt, className = "", sizes }: Props) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        sizes={sizes}
        loading="lazy"
        decoding="async"
        className={`ba-recipe-img ${className}`.trim()}
      />
    );
  }
  return (
    <div
      className={`ba-recipe-img ba-recipe-img-fallback ${className}`.trim()}
      aria-hidden
    />
  );
}
