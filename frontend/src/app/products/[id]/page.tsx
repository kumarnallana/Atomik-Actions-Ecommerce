import ProductDetailClient from "./ProductDetailClient";

export async function generateStaticParams() {
  return [1, 2, 3, 4, 5, 6, 7, 8].map((id) => ({
    id: id.toString(),
  }));
}

export const dynamicParams = true;

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  return <ProductDetailClient productId={Number(params.id)} />;
}

