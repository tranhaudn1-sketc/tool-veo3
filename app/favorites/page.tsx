import { AppLayout } from "@/components/layout/app-layout";
import { GalleryView } from "@/components/gallery/gallery-view";

export default function FavoritesPage() {
  return (
    <AppLayout>
      <GalleryView initialFavoriteOnly={true} />
    </AppLayout>
  );
}
