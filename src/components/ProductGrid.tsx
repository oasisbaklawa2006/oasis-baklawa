import type {
  BuyerProductPrice,
  CustomerCatalogueItem,
  PublishedProduct,
} from '../contracts/customerGateway';

interface ProductGridProps {
  products: Array<CustomerCatalogueItem | PublishedProduct>;
}

function getPrice(product: CustomerCatalogueItem | PublishedProduct): BuyerProductPrice | null {
  return 'buyer_price' in product ? product.buyer_price : null;
}

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <section aria-labelledby="catalogue-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Curated catalogue</span>
          <h2 id="catalogue-heading">Published collection</h2>
        </div>
        <span>{products.length} products</span>
      </div>

      <div className="product-grid">
        {products.map((product) => {
          const price = getPrice(product);

          return (
            <article className="product-card" key={product.product_id}>
              <img src={product.hero_image_url} alt={product.product_name} loading="lazy" />
              <div className="product-card__body">
                <span className="eyebrow">{product.category ?? 'Oasis Baklawa'}</span>
                <h3>{product.product_name}</h3>
                <p>{product.short_description ?? product.long_description ?? 'Premium handcrafted selection.'}</p>
                <div className="product-card__footer">
                  <span>{product.pack_size ?? product.primary_uom ?? 'Pack details on request'}</span>
                  {price ? (
                    <strong>
                      {price.currency} {price.selling_price.toLocaleString('en-IN')}
                      {price.uom ? ` / ${price.uom}` : ''}
                    </strong>
                  ) : (
                    <span>Sign in for trade price</span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
