import Image from "next/image";

function Ingredient({ src, className }: { src: string; className: string }) {
  return (
    <div className={className}>
      <Image src={src} alt="" fill className="object-contain" />
    </div>
  );
}

export function LoginBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <Ingredient
        src="/ingredients/hero-purple@2x.png"
        className="absolute left-12 top-20 h-36 w-36 -rotate-12 opacity-25"
      />
      <Ingredient
        src="/ingredients/hero-green@2x.png"
        className="absolute left-1/4 top-12 h-40 w-40 rotate-6 opacity-28"
      />
      <Ingredient
        src="/ingredients/hero-orange@2x.png"
        className="absolute right-1/4 top-16 h-44 w-44 -rotate-15 opacity-30"
      />
      <Ingredient
        src="/ingredients/hero-yellow@2x.png"
        className="absolute right-16 top-24 h-40 w-40 rotate-20 opacity-26"
      />
      <Ingredient
        src="/ingredients/hero-pink@2x.png"
        className="absolute left-8 top-1/2 h-40 w-40 -translate-y-1/2 rotate-15 opacity-24"
      />
      <Ingredient
        src="/ingredients/hero-green@2x.png"
        className="absolute right-12 top-1/2 h-40 w-40 -translate-y-1/2 -rotate-20 opacity-26"
      />
      <Ingredient
        src="/ingredients/hero-orange@2x.png"
        className="absolute bottom-20 left-20 h-44 w-44 rotate-8 opacity-28"
      />
      <Ingredient
        src="/ingredients/hero-purple@2x.png"
        className="absolute bottom-16 left-1/3 h-36 w-36 -rotate-10 opacity-24"
      />
      <Ingredient
        src="/ingredients/hero-yellow@2x.png"
        className="absolute bottom-12 right-1/3 h-40 w-40 rotate-18 opacity-27"
      />
      <Ingredient
        src="/ingredients/hero-pink@2x.png"
        className="absolute bottom-24 right-16 h-40 w-40 -rotate-12 opacity-26"
      />
    </div>
  );
}
