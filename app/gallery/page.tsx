import { AppLayout } from "@/components/layout/app-layout";
import { GalleryView } from "@/components/gallery/gallery-view";

export default function GalleryPage() {
  return (
    <AppLayout>
      <GalleryView initialFavoriteOnly={false} />
    </AppLayout>
  );
}
