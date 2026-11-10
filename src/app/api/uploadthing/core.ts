import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

// Lefifi media uploads remain on UploadThing; Firebase Storage is not used.
// Keep the client-side validation in request-form.tsx in sync with these limits.
export const ourFileRouter = {
  fileUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
    video: { maxFileSize: "16MB", maxFileCount: 1 },
    pdf: { maxFileSize: "4MB", maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => {
    console.info("[Lefifi] customer or operations attachment uploaded", {
      name: file.name,
      size: file.size,
      type: file.type,
      urlAvailable: Boolean(file.url || file.ufsUrl),
    });
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
