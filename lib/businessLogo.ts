/** Matches the app crop export: square JPEG named logo.jpg, 512px, quality 0.85. */

export const LOGO_OUTPUT_SIZE = 512;
export const LOGO_JPEG_QUALITY = 0.85;
export const SIGNUP_LOGO_NAME = "logo.jpg";
export const SIGNUP_LOGO_TYPE = "image/jpeg";

export function blobToSignupLogo(blob: Blob) {
  return new File([blob], SIGNUP_LOGO_NAME, { type: SIGNUP_LOGO_TYPE });
}

export function appendSignupLogo(form: FormData, file: File) {
  form.append("logo", file, SIGNUP_LOGO_NAME);
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Please use a JPEG or PNG photo for the logo."));
    image.src = src;
  });
}

export async function rotateImageSrc(src: string) {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalHeight;
  canvas.height = image.naturalWidth;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not rotate the logo.");
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(Math.PI / 2);
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (next) => (next ? resolve(next) : reject(new Error("Could not rotate the logo."))),
      SIGNUP_LOGO_TYPE,
      1,
    );
  });
  return URL.createObjectURL(blob);
}

export async function cropImageToSignupLogo(input: {
  src: string;
  originX: number;
  originY: number;
  size: number;
}) {
  const image = await loadImage(input.src);
  const canvas = document.createElement("canvas");
  canvas.width = LOGO_OUTPUT_SIZE;
  canvas.height = LOGO_OUTPUT_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the logo.");
  context.drawImage(
    image,
    input.originX,
    input.originY,
    input.size,
    input.size,
    0,
    0,
    LOGO_OUTPUT_SIZE,
    LOGO_OUTPUT_SIZE,
  );
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (next) => (next ? resolve(next) : reject(new Error("Could not prepare the logo."))),
      SIGNUP_LOGO_TYPE,
      LOGO_JPEG_QUALITY,
    );
  });
  return blobToSignupLogo(blob);
}
