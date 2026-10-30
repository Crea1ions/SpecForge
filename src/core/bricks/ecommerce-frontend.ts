import type { GenerationContext, GeneratedFile } from '../types';
import { getContentByteLength } from '../utils';

const BRICK_ID = 'react-vite';
const BRICK_NAME = 'React 19 + Vite Frontend';
const BRICK_VERSION = '2.1.0';

function makeFile(
  path: string,
  source: string,
  language: GeneratedFile['language'],
  reason: string,
  decisionRef?: string
): GeneratedFile {
  const content = source.trimStart();
  return {
    path,
    content,
    language,
    size: getContentByteLength(content),
    brickId: BRICK_ID,
    brickName: BRICK_NAME,
    brickVersion: BRICK_VERSION,
    reason,
    decisionRef,
  };
}

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function tsString(value: string): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function generateEcommerceFrontendFiles(ctx: GenerationContext): GeneratedFile[] {
  const { project } = ctx.spec;
  const projectName = tsString(project.name);
  const projectDescription = tsString(project.description);
  const frontendPackageName = JSON.stringify(`${project.slug}-frontend`);
  const projectVersion = JSON.stringify(project.version);
  const htmlTitle = htmlEscape(project.name);

  const packageJson = `{
  "name": ${frontendPackageName},
  "private": true,
  "version": ${projectVersion},
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "~5.8.2",
    "vite": "^6.0.3"
  }
}
`;

  const indexHtml = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${htmlEscape(project.description)}" />
    <title>${htmlTitle}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

  const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:${ctx.spec.backend.port}',
        changeOrigin: true,
      },
    },
  },
});
`;

  const tsconfigJson = `{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
`;

  const tsconfigAppJson = `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
`;

  const tsconfigNodeJson = `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
`;

  const mainTsx = `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
`;

  const appTsx = `import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';

const STORE_NAME = ${projectName};
const STORE_DESCRIPTION = ${projectDescription};
const TOKEN_KEY = 'specforge-customer-token';
const ADMIN_TOKEN_KEY = 'specforge-admin-token';
const ADMIN_ROLE_KEY = 'specforge-admin-role';
const CART_SESSION_KEY = 'specforge-cart-session';
const THEME_KEY = 'specforge-ecommerce-theme';

type LocalizedText = string | Record<string, string> | null | undefined;

interface ProductImage {
  url: string;
  alt?: LocalizedText;
  is_primary?: boolean;
}

interface Category {
  id: number | string;
  name: LocalizedText;
  slug?: string;
}

interface Product {
  id: number | string;
  sku: string;
  name: LocalizedText;
  description_short?: LocalizedText;
  description_long?: LocalizedText;
  price_catalog: number;
  compare_price?: number | null;
  currency?: string;
  images?: ProductImage[];
  product_images?: ProductImage[];
  categories?: Category[];
  stock_tracked?: boolean;
  available_quantity?: number | null;
  quantity_on_hand?: number | null;
  alert_threshold?: number;
  is_active?: boolean;
  is_published?: boolean;
  is_sellable?: boolean;
}

interface CartLine {
  product_id?: number | string;
  quantity: number;
  product?: Product;
  name?: LocalizedText;
  sku?: string;
  unit_price_incl_tax?: number;
  total_incl_tax?: number;
}

interface Cart {
  currency?: string;
  items?: CartLine[];
  lines?: CartLine[];
  cart_lines?: CartLine[];
  subtotal?: number;
  total?: number;
  total_incl_tax?: number;
}

interface Order {
  id?: number | string;
  reference?: string;
  order_number?: string;
  number?: string;
  status: string;
  payment_status?: string;
  shipment_status?: string | null;
  total?: number;
  total_incl_tax?: number;
  currency?: string;
  placed_at?: string;
  created_at?: string;
}

interface CustomerAddress {
  id: number;
  address_type: 'billing' | 'shipping' | 'both';
  recipient: string;
  street1: string;
  street2?: string | null;
  zip: string;
  city: string;
  country: string;
  region?: string | null;
}

interface AdminReturn {
  id: number;
  order_number: string;
  status: string;
  reason: string;
  customer_email: string;
  created_at: string;
  successful_refund_count?: number;
}

interface CustomerReturn {
  id: number;
  order_number: string;
  status: string;
  reason: string;
  created_at: string;
  successful_refund_count: number;
}

interface ContentPage {
  id: number;
  slug: string;
  title: Record<string, string>;
  body: Record<string, string>;
  status: 'draft' | 'published' | 'scheduled';
  publish_at: string | null;
  is_indexable: boolean;
  created_at?: string;
  updated_at?: string;
}

interface ContentMenuItem {
  id: number;
  label: Record<string, string>;
  location: 'main' | 'footer-shop' | 'footer-service' | 'footer-legal';
  parent_id: number | null;
  page_id: number | null;
  page_slug: string | null;
  target_url: string | null;
  sort_order: number;
  open_new_tab: boolean;
}

interface AdminCustomer {
  id: number;
  email: string;
  full_name: string;
  locale: string;
  is_active: boolean;
  created_at: string;
  order_count: number;
}

interface AdminUnpaidOrder {
  order_number: string;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  payment_status: string;
  currency: string;
  total: number;
  placed_at: string | null;
}

interface AbandonedCart {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  currency: string;
  updated_at: string;
  line_count: number;
  subtotal: number;
  recovery_notification_queued: boolean;
}

interface AdminDashboard {
  from: string;
  to: string;
  order_count: number;
  sales_by_currency: Array<{
    currency: string;
    order_count: number;
    sales_ttc: number;
    average_order_value_ttc: number;
  }>;
  top_products: Array<{
    product_id: number | null;
    sku: string;
    name: LocalizedText;
    currency: string;
    units_sold: number;
    sales: number;
  }>;
  closed_return_count: number;
  successful_refund_count: number;
  refunded_amounts_by_currency: Array<{
    currency: string;
    refunded_amount: number;
  }>;
  stock_alert_count: number;
  stock_alerts: Array<{
    product_id: number;
    sku: string;
    name: LocalizedText;
    available: number;
    alert_threshold: number;
  }>;
}

interface ShippingMethod {
  id: number;
  name: LocalizedText;
  currency: string;
  pricing_type: string;
  fixed_price?: number | null;
  free_over_amount?: number | null;
}

interface AuthResponse {
  access_token?: string;
  token?: string;
  customer?: { first_name?: string; last_name?: string; email?: string };
  principal?: { role?: string };
}

interface CheckoutResponse {
  order_number?: string;
  reference?: string;
  status?: string;
}

type Page = 'catalog' | 'product' | 'cart' | 'checkout' | 'account' | 'content' | 'admin';
type AdminSection =
  | 'dashboard'
  | 'products'
  | 'orders'
  | 'customers'
  | 'unpaid'
  | 'carts'
  | 'returns'
  | 'content';
type Collection<T> = T[] | { items?: T[]; data?: T[] };

function rows<T>(collection: Collection<T>): T[] {
  if (Array.isArray(collection)) return collection as T[];
  return collection.items ?? collection.data ?? [];
}

function localized(value: LocalizedText): string {
  if (typeof value === 'string') return value;
  if (!value) return '';
  return value.fr ?? value['fr-FR'] ?? Object.values(value)[0] ?? '';
}

function money(amount: number | null | undefined, currency = 'EUR'): string {
  const minorUnits = Number.isFinite(amount) ? (amount ?? 0) : 0;
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
    }).format(minorUnits / 100);
  } catch {
    return (minorUnits / 100).toFixed(2) + ' ' + currency;
  }
}

function imageOf(product: Product): ProductImage | undefined {
  const images = product.images ?? product.product_images ?? [];
  return images.find((image) => image.is_primary) ?? images[0];
}

function productPrice(product: Product): number {
  return product.price_catalog;
}

function displayOrderNumber(order: Order): string {
  return order.reference ?? order.order_number ?? order.number ?? String(order.id ?? '—');
}

function defaultDashboardRange(): { from: string; to: string } {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + 1);
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 29);
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

function localDateTimeInput(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = window.localStorage.getItem(
    path.startsWith('/api/admin') ? ADMIN_TOKEN_KEY : TOKEN_KEY
  );
  if (token) headers.set('Authorization', 'Bearer ' + token);
  let cartSession = window.localStorage.getItem(CART_SESSION_KEY);
  if (!cartSession) {
    const bytes = new Uint8Array(24);
    window.crypto.getRandomValues(bytes);
    cartSession = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    window.localStorage.setItem(CART_SESSION_KEY, cartSession);
  }
  headers.set('x-cart-session', cartSession);

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: 'same-origin',
  });
  if (!response.ok) {
    let detail = '';
    try {
      const body: unknown = await response.json();
      if (typeof body === 'object' && body !== null && 'message' in body) {
        const message = body.message;
        if (typeof message === 'string') detail = message;
      } else if (typeof body === 'object' && body !== null && 'error' in body) {
        const error = body.error;
        if (typeof error === 'string') detail = error;
      }
    } catch {
      detail = '';
    }
    throw new Error(detail || 'La requête a échoué (' + response.status + ').');
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function downloadPdf(path: string): Promise<void> {
  const headers = new Headers();
  const token = window.localStorage.getItem(
    path.startsWith('/api/admin') ? ADMIN_TOKEN_KEY : TOKEN_KEY
  );
  if (token) headers.set('Authorization', 'Bearer ' + token);
  const response = await fetch(path, { headers, credentials: 'same-origin' });
  if (!response.ok) {
    let detail = '';
    try {
      const body: unknown = await response.json();
      if (typeof body === 'object' && body !== null && 'error' in body) {
        const error = body.error;
        if (typeof error === 'string') detail = error;
      }
    } catch {
      detail = '';
    }
    throw new Error(detail || 'Le document n’est pas disponible (' + response.status + ').');
  }
  if (!response.headers.get('content-type')?.toLowerCase().includes('application/pdf')) {
    throw new Error('Le serveur n’a pas renvoyé un document PDF.');
  }
  const objectUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = path.split('/').filter(Boolean).slice(-2).join('-') + '.pdf';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}

function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}

export default function App() {
  const [page, setPage] = useState<Page>('catalog');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [shippingMethodId, setShippingMethodId] = useState('');
  const [cart, setCart] = useState<Cart | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [loadedProduct, setLoadedProduct] = useState<Product | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cartLoading, setCartLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [authenticated, setAuthenticated] = useState(
    () => Boolean(window.localStorage.getItem(TOKEN_KEY))
  );
  const [adminAuthenticated, setAdminAuthenticated] = useState(
    () => Boolean(window.localStorage.getItem(ADMIN_TOKEN_KEY))
  );
  const [adminRole, setAdminRole] = useState(
    () => window.localStorage.getItem(ADMIN_ROLE_KEY)
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [adminReturns, setAdminReturns] = useState<AdminReturn[]>([]);
  const [customerReturns, setCustomerReturns] = useState<CustomerReturn[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [checkoutAddressId, setCheckoutAddressId] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [promotionCode, setPromotionCode] = useState('');
  const [returnReasons, setReturnReasons] = useState<Record<string, string>>({});
  const [adminRefusalReasons, setAdminRefusalReasons] = useState<Record<number, string>>({});
  const [customerLoading, setCustomerLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSection, setAdminSection] = useState<AdminSection>(() => {
    const role = window.localStorage.getItem(ADMIN_ROLE_KEY);
    return role === 'editor' ? 'content' : role === 'operator' ? 'orders' : 'dashboard';
  });
  const [adminDashboard, setAdminDashboard] = useState<AdminDashboard | null>(null);
  const [dashboardRange, setDashboardRange] = useState(defaultDashboardRange);
  const [dashboardFromDraft, setDashboardFromDraft] = useState(() => defaultDashboardRange().from);
  const [dashboardToDraft, setDashboardToDraft] = useState(() => defaultDashboardRange().to);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [adminCustomers, setAdminCustomers] = useState<AdminCustomer[]>([]);
  const [unpaidOrders, setUnpaidOrders] = useState<AdminUnpaidOrder[]>([]);
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCart[]>([]);
  const [adminContentPages, setAdminContentPages] = useState<ContentPage[]>([]);
  const [adminContentMenus, setAdminContentMenus] = useState<ContentMenuItem[]>([]);
  const [editingContentPage, setEditingContentPage] = useState<ContentPage | null>(null);
  const [editingMenuItem, setEditingMenuItem] = useState<ContentMenuItem | null>(null);
  const [publicMainMenu, setPublicMainMenu] = useState<ContentMenuItem[]>([]);
  const [publicFooterMenus, setPublicFooterMenus] = useState<ContentMenuItem[]>([]);
  const [publicMenuLoading, setPublicMenuLoading] = useState(true);
  const [selectedContentSlug, setSelectedContentSlug] = useState<string | null>(null);
  const [publicContentPage, setPublicContentPage] = useState<ContentPage | null>(null);
  const [publicContentLoading, setPublicContentLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
  );

  useEffect(() => {
    document.body.classList.toggle('theme-dark', theme === 'dark');
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileMenuOpen]);

  const cartLines = cart?.items ?? cart?.lines ?? cart?.cart_lines ?? [];
  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const currency = cart?.currency ?? products[0]?.currency ?? 'EUR';
  const subtotal =
    cart?.total_incl_tax ??
    cart?.total ??
    cart?.subtotal ??
    cartLines.reduce(
      (sum, line) =>
        sum +
        (line.total_incl_tax ??
          (line.unit_price_incl_tax ?? line.product?.price_catalog ?? 0) * line.quantity),
      0
    );

  useEffect(() => {
    let cancelled = false;
    setLoadingProducts(true);
    setError('');
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (categoryId) params.set('category_id', categoryId);
    params.set('sort', 'display_order');
    const suffix = params.toString();
    void api<Collection<Product>>('/api/products' + (suffix ? '?' + suffix : ''))
      .then((result) => {
        if (!cancelled) setProducts(rows(result));
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Catalogue indisponible.');
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, categoryId]);

  useEffect(() => {
    let cancelled = false;
    void api<Collection<Category>>('/api/categories')
      .then((result) => {
        if (!cancelled) setCategories(rows(result));
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setCategories([]);
          setError(cause instanceof Error ? cause.message : 'Catégories indisponibles.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api<Collection<ShippingMethod>>('/api/shipping-methods')
      .then((result) => {
        if (cancelled) return;
        const methods = rows(result);
        setShippingMethods(methods);
        setShippingMethodId((current) =>
          methods.some((method) => String(method.id) === current)
            ? current
            : String(methods[0]?.id ?? '')
        );
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setShippingMethods([]);
          setError(cause instanceof Error ? cause.message : 'Modes de livraison indisponibles.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCartLoading(true);
    void api<Cart>('/api/cart')
      .then((result) => {
        if (!cancelled) setCart(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setCart(null);
          setError(cause instanceof Error ? cause.message : 'Panier indisponible.');
        }
      })
      .finally(() => {
        if (!cancelled) setCartLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (page !== 'product' || !selectedProductId) return;
    let cancelled = false;
    setLoadedProduct(null);
    void api<Product>('/api/products/' + encodeURIComponent(selectedProductId))
      .then((product) => {
        if (!cancelled) setLoadedProduct(product);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Produit indisponible.');
      });
    return () => {
      cancelled = true;
    };
  }, [page, selectedProductId]);

  useEffect(() => {
    if (page !== 'account' || !authenticated) return;
    let cancelled = false;
    setCustomerLoading(true);
    Promise.all([
      api<Collection<Order>>('/api/customer/orders'),
      api<Collection<CustomerReturn>>('/api/customer/returns'),
    ])
      .then(([orderResult, returnResult]) => {
        if (!cancelled) {
          setOrders(rows(orderResult));
          setCustomerReturns(rows(returnResult));
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Historique indisponible.');
      })
      .finally(() => {
        if (!cancelled) setCustomerLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, authenticated]);

  useEffect(() => {
    if (!authenticated || (page !== 'account' && page !== 'checkout')) return;
    let cancelled = false;
    void api<Collection<CustomerAddress>>('/api/customer/addresses')
      .then((result) => {
        if (!cancelled) setAddresses(rows(result));
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setAddresses([]);
          setError(cause instanceof Error ? cause.message : 'Carnet d’adresses indisponible.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [page, authenticated]);

  useEffect(() => {
    if (page !== 'admin' || !adminAuthenticated || !adminRole) return;
    let cancelled = false;
    setAdminLoading(true);
    setError('');
    Promise.all([
      api<Collection<Product>>('/api/admin/products'),
      ['manager', 'operator'].includes(adminRole)
        ? api<Collection<Order>>('/api/admin/orders')
        : Promise.resolve([] as Order[]),
      ['manager', 'operator'].includes(adminRole)
        ? api<Collection<AdminReturn>>('/api/admin/returns')
        : Promise.resolve([] as AdminReturn[]),
      ['manager', 'operator'].includes(adminRole)
        ? api<Collection<AdminCustomer>>('/api/admin/customers')
        : Promise.resolve([] as AdminCustomer[]),
      ['manager', 'operator'].includes(adminRole)
        ? api<Collection<AdminUnpaidOrder>>('/api/admin/unpaid-orders')
        : Promise.resolve([] as AdminUnpaidOrder[]),
      ['manager', 'operator'].includes(adminRole)
        ? api<Collection<AbandonedCart>>('/api/admin/carts/abandoned')
        : Promise.resolve([] as AbandonedCart[]),
      ['manager', 'editor'].includes(adminRole)
        ? api<Collection<ContentPage>>('/api/admin/content/pages')
        : Promise.resolve([] as ContentPage[]),
      ['manager', 'editor'].includes(adminRole)
        ? api<Collection<ContentMenuItem>>('/api/admin/content/menu')
        : Promise.resolve([] as ContentMenuItem[]),
    ])
      .then(([
        productResult,
        orderResult,
        returnResult,
        customerResult,
        unpaidResult,
        cartResult,
        pageResult,
        menuResult,
      ]) => {
        if (!cancelled) {
          setAdminProducts(rows(productResult));
          setAdminOrders(rows(orderResult));
          setAdminReturns(rows(returnResult));
          setAdminCustomers(rows(customerResult));
          setUnpaidOrders(rows(unpaidResult));
          setAbandonedCarts(rows(cartResult));
          setAdminContentPages(rows(pageResult));
          setAdminContentMenus(rows(menuResult));
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Les données d’administration sont indisponibles.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setAdminLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, adminAuthenticated, adminRole]);

  useEffect(() => {
    let cancelled = false;
    setPublicMenuLoading(true);
    Promise.all([
      api<Collection<ContentMenuItem>>('/api/content/menu?location=main'),
      api<Collection<ContentMenuItem>>('/api/content/menu?location=footer-shop'),
      api<Collection<ContentMenuItem>>('/api/content/menu?location=footer-service'),
      api<Collection<ContentMenuItem>>('/api/content/menu?location=footer-legal'),
    ])
      .then(([main, shop, service, legal]) => {
        if (!cancelled) {
          setPublicMainMenu(rows(main));
          setPublicFooterMenus([...rows(shop), ...rows(service), ...rows(legal)]);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setPublicMainMenu([]);
          setPublicFooterMenus([]);
          setError(cause instanceof Error ? cause.message : 'Navigation indisponible.');
        }
      })
      .finally(() => {
        if (!cancelled) setPublicMenuLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (page !== 'content' || !selectedContentSlug) return;
    let cancelled = false;
    setPublicContentLoading(true);
    setPublicContentPage(null);
    setError('');
    void api<ContentPage>('/api/content/pages/' + encodeURIComponent(selectedContentSlug))
      .then((content) => {
        if (!cancelled) setPublicContentPage(content);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Page indisponible.');
      })
      .finally(() => {
        if (!cancelled) setPublicContentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, selectedContentSlug]);

  useEffect(() => {
    if (page !== 'admin' || !adminAuthenticated || adminRole !== 'manager') return;
    let cancelled = false;
    const params = new URLSearchParams({ from: dashboardRange.from, to: dashboardRange.to });
    setDashboardLoading(true);
    void api<AdminDashboard>('/api/admin/dashboard?' + params.toString())
      .then((result) => {
        if (!cancelled) setAdminDashboard(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Statistiques indisponibles.');
      })
      .finally(() => {
        if (!cancelled) setDashboardLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, adminAuthenticated, adminRole, dashboardRange]);

  const featuredProducts = useMemo(() => products.slice(0, 3), [products]);

  async function refreshCart(): Promise<void> {
    setCart(await api<Cart>('/api/cart'));
  }

  async function addToCart(product: Product): Promise<void> {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api('/api/cart/items', {
        method: 'POST',
        body: jsonBody({ product_id: product.id, quantity: 1 }),
      });
      await refreshCart();
      setNotice('« ' + localized(product.name) + ' » a été ajouté au panier.');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Impossible d’ajouter ce produit.');
    } finally {
      setBusy(false);
    }
  }

  async function changeQuantity(line: CartLine, quantity: number): Promise<void> {
    const productId = line.product_id ?? line.product?.id;
    if (productId === undefined) return;
    setBusy(true);
    setError('');
    try {
      const path = '/api/cart/items/' + encodeURIComponent(String(productId));
      if (quantity <= 0) {
        await api(path, { method: 'DELETE' });
      } else {
        await api(path, { method: 'PATCH', body: jsonBody({ quantity }) });
      }
      await refreshCart();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Impossible de modifier le panier.');
    } finally {
      setBusy(false);
    }
  }

  function openProduct(product: Product): void {
    setSelectedProductId(String(product.id));
    setPage('product');
    setError('');
    setNotice('');
  }

  function goTo(nextPage: Page): void {
    setPage(nextPage);
    setError('');
    setNotice('');
    setMobileMenuOpen(false);
  }

  function openContent(slug: string): void {
    setSelectedContentSlug(slug);
    goTo('content');
  }

  function renderMenuItems(parentId: number | null): ReactNode {
    return publicMainMenu
      .filter((item) => item.parent_id === parentId)
      .map((item) => {
        const children = publicMainMenu.some((child) => child.parent_id === item.id);
        return (
          <div className="main-menu-item" key={item.id}>
            {item.page_slug ? (
              <button type="button" aria-current={selectedContentSlug === item.page_slug ? 'page' : undefined} onClick={() => openContent(item.page_slug ?? '')}>{localized(item.label)}</button>
            ) : item.target_url ? (
              <a href={item.target_url} target={item.open_new_tab ? '_blank' : undefined} rel={item.open_new_tab ? 'noreferrer' : undefined}>{localized(item.label)}</a>
            ) : (
              <span tabIndex={children ? 0 : undefined}>{localized(item.label)}</span>
            )}
            {children && <div className="main-menu-children">{renderMenuItems(item.id)}</div>}
          </div>
        );
      });
  }

  function renderFooterMenuItems(location: ContentMenuItem['location']): ReactNode {
    if (publicMenuLoading) return <span className="muted">Chargement des informations…</span>;
    return publicFooterMenus
      .filter((item) => item.location === location)
      .map((item) => item.page_slug ? (
        <button type="button" key={item.id} onClick={() => openContent(item.page_slug ?? '')}>{localized(item.label)}</button>
      ) : item.target_url ? (
        <a key={item.id} href={item.target_url} target={item.open_new_tab ? '_blank' : undefined} rel={item.open_new_tab ? 'noreferrer' : undefined}>{localized(item.label)}</a>
      ) : null);
  }

  async function downloadDocument(path: string): Promise<void> {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await downloadPdf(path);
      setNotice('Le document PDF a été téléchargé.');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Le document n’a pas pu être téléchargé.');
    } finally {
      setBusy(false);
    }
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      first_name: String(formData.get('first_name') ?? ''),
      last_name: String(formData.get('last_name') ?? ''),
    };
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await api<AuthResponse>(endpoint, {
        method: 'POST',
        body: jsonBody(payload),
      });
      const token = response.access_token ?? response.token;
      if (!token) throw new Error('La réponse de connexion ne contient pas de jeton.');
      window.localStorage.setItem(TOKEN_KEY, token);
      setAuthenticated(true);
      setNotice('Vous êtes connecté(e).');
      setPage('account');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Connexion impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function submitAdminAuth(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await api<AuthResponse>('/api/admin/login', {
        method: 'POST',
        body: jsonBody({
          email: String(formData.get('email') ?? ''),
          password: String(formData.get('password') ?? ''),
        }),
      });
      const token = response.access_token ?? response.token;
      const role = response.principal?.role;
      if (!token || !role || !['manager', 'editor', 'operator'].includes(role)) {
        throw new Error('Le compte ne dispose pas d’un rôle d’administration.');
      }
      window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
      window.localStorage.setItem(ADMIN_ROLE_KEY, role);
      setAdminAuthenticated(true);
      setAdminRole(role);
      setAdminSection(role === 'editor' ? 'content' : role === 'operator' ? 'orders' : 'dashboard');
      setNotice('Connexion à l’administration réussie.');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Connexion à l’administration impossible.');
    } finally {
      setBusy(false);
    }
  }

  function signOut(): void {
    window.localStorage.removeItem(TOKEN_KEY);
    setAuthenticated(false);
    setOrders([]);
    setCustomerReturns([]);
    setAddresses([]);
    setEditingAddress(null);
    setCheckoutAddressId('');
    setNotice('Vous êtes déconnecté(e).');
  }

  function adminSignOut(): void {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    window.localStorage.removeItem(ADMIN_ROLE_KEY);
    setAdminAuthenticated(false);
    setAdminRole(null);
    setAdminProducts([]);
    setAdminOrders([]);
    setAdminReturns([]);
    setAdminCustomers([]);
    setUnpaidOrders([]);
    setAbandonedCarts([]);
    setAdminContentPages([]);
    setAdminContentMenus([]);
    setNotice('Vous êtes déconnecté(e) de l’administration.');
  }

  async function submitCheckout(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const savedAddress = addresses.find((address) => String(address.id) === checkoutAddressId);
    const address = savedAddress
      ? {
          recipient: savedAddress.recipient,
          street1: savedAddress.street1,
          street2: savedAddress.street2,
          zip: savedAddress.zip,
          city: savedAddress.city,
          country: savedAddress.country,
          region: savedAddress.region,
          email: String(formData.get('email') ?? ''),
          phone: String(formData.get('phone') ?? ''),
        }
      : {
          first_name: String(formData.get('first_name') ?? ''),
          last_name: String(formData.get('last_name') ?? ''),
          address_line1: String(formData.get('address_line1') ?? ''),
          postal_code: String(formData.get('postal_code') ?? ''),
          city: String(formData.get('city') ?? ''),
          country: String(formData.get('country') ?? ''),
          email: String(formData.get('email') ?? ''),
          phone: String(formData.get('phone') ?? ''),
        };
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api<CheckoutResponse>('/api/orders/checkout', {
        method: 'POST',
        body: jsonBody({
          billing_address: address,
          shipping_address: address,
          shipping_method_id: shippingMethodId ? Number(shippingMethodId) : null,
          promotion_code: promotionCode.trim() || null,
        }),
      });
      setNotice(
        'Commande ' +
          (result.reference ?? result.order_number ?? 'créée') +
          ' enregistrée. Le paiement de démonstration est géré par le serveur.'
      );
      await refreshCart();
      setPage('account');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'La commande n’a pas pu être créée.');
    } finally {
      setBusy(false);
    }
  }

  async function submitAddress(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      address_type: String(formData.get('address_type') ?? 'both'),
      recipient: String(formData.get('recipient') ?? ''),
      street1: String(formData.get('street1') ?? ''),
      street2: String(formData.get('street2') ?? ''),
      zip: String(formData.get('zip') ?? ''),
      city: String(formData.get('city') ?? ''),
      country: String(formData.get('country') ?? ''),
      region: String(formData.get('region') ?? ''),
    };
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const path = editingAddress
        ? '/api/customer/addresses/' + editingAddress.id
        : '/api/customer/addresses';
      await api(path, {
        method: editingAddress ? 'PUT' : 'POST',
        body: jsonBody(payload),
      });
      setAddresses(rows(await api<Collection<CustomerAddress>>('/api/customer/addresses')));
      setEditingAddress(null);
      form.reset();
      setNotice('Adresse enregistrée.');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Impossible d’enregistrer cette adresse.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAddress(address: CustomerAddress): Promise<void> {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api('/api/customer/addresses/' + address.id, { method: 'DELETE' });
      setAddresses(rows(await api<Collection<CustomerAddress>>('/api/customer/addresses')));
      if (editingAddress?.id === address.id) setEditingAddress(null);
      if (checkoutAddressId === String(address.id)) setCheckoutAddressId('');
      setNotice('Adresse supprimée.');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Impossible de supprimer cette adresse.');
    } finally {
      setBusy(false);
    }
  }

  async function requestReturn(event: FormEvent<HTMLFormElement>, order: Order): Promise<void> {
    event.preventDefault();
    const reference = displayOrderNumber(order);
    const reason = returnReasons[reference]?.trim();
    if (!reason) {
      setError('Veuillez indiquer le motif de votre demande de retour.');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api('/api/customer/orders/' + encodeURIComponent(reference) + '/returns', {
        method: 'POST',
        body: jsonBody({ reason }),
      });
      setCustomerReturns(rows(await api<Collection<CustomerReturn>>('/api/customer/returns')));
      setNotice('Votre demande de retour a été enregistrée.');
      setReturnReasons((current) => ({ ...current, [reference]: '' }));
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'La demande de retour a échoué.');
    } finally {
      setBusy(false);
    }
  }

  async function processAdminReturn(
    returnRequest: AdminReturn,
    action: 'approve' | 'reject' | 'receive'
  ): Promise<void> {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api('/api/admin/returns/' + returnRequest.id + '/process', {
        method: 'POST',
        body: jsonBody({
          action,
          restock: action === 'receive',
          refusal_reason: action === 'reject' ? adminRefusalReasons[returnRequest.id] : undefined,
        }),
      });
      setAdminReturns(rows(await api<Collection<AdminReturn>>('/api/admin/returns')));
      setAdminOrders(rows(await api<Collection<Order>>('/api/admin/orders')));
      setNotice(
        action === 'approve'
          ? 'Retour approuvé.'
          : action === 'reject'
            ? 'Demande de retour refusée.'
            : 'Retour reçu et remboursement mock traité.'
      );
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Le traitement du retour a échoué.');
    } finally {
      setBusy(false);
    }
  }

  async function advanceShipment(
    order: Order,
    status: 'ready' | 'shipped' | 'delivered'
  ): Promise<void> {
    const reference = displayOrderNumber(order);
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api('/api/admin/orders/' + encodeURIComponent(reference) + '/shipment', {
        method: 'POST',
        body: jsonBody({ status }),
      });
      setAdminOrders(rows(await api<Collection<Order>>('/api/admin/orders')));
      setNotice(
        status === 'ready'
          ? 'Commande préparée.'
          : status === 'shipped'
            ? 'Expédition enregistrée et stock décrémenté.'
            : 'Livraison enregistrée.'
      );
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'La mise à jour de la livraison a échoué.');
    } finally {
      setBusy(false);
    }
  }

  async function queueRecoveryNotification(cartItem: AbandonedCart): Promise<void> {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api<{ status: string; message: string }>(
        '/api/admin/carts/' + cartItem.id + '/recovery',
        { method: 'POST' }
      );
      setAbandonedCarts(rows(await api<Collection<AbandonedCart>>('/api/admin/carts/abandoned')));
      setNotice(result.message);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'La notification n’a pas été mise en file.');
    } finally {
      setBusy(false);
    }
  }

  async function updateAdminProduct(
    event: FormEvent<HTMLFormElement>,
    product: Product
  ): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, boolean | number> = {
      is_sellable: formData.get('is_sellable') === 'on',
      is_published: formData.get('is_published') === 'on',
    };
    if (['manager', 'operator'].includes(adminRole ?? '')) {
      payload.price_catalog = Number(formData.get('price_catalog'));
      payload.quantity_on_hand = Number(formData.get('quantity_on_hand'));
      payload.alert_threshold = Number(formData.get('alert_threshold'));
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api('/api/admin/products/' + encodeURIComponent(String(product.id)), {
        method: 'PATCH',
        body: jsonBody(payload),
      });
      setAdminProducts(rows(await api<Collection<Product>>('/api/admin/products')));
      setNotice('Produit mis à jour.');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'La mise à jour du produit a échoué.');
    } finally {
      setBusy(false);
    }
  }

  async function saveAdminContentPage(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const titleText = String(formData.get('title') ?? '').trim();
    const bodyText = String(formData.get('body') ?? '').trim();
    const status = String(formData.get('status') ?? 'draft') as ContentPage['status'];
    const publishValue = String(formData.get('publish_at') ?? '');
    const publishDate = publishValue ? new Date(publishValue) : null;
    if (!titleText || !bodyText || (publishDate && Number.isNaN(publishDate.getTime()))) {
      setError('Le titre, le contenu et la date de publication doivent être valides.');
      return;
    }
    if (status === 'scheduled' && !publishDate) {
      setError('Une date de publication future est requise pour une page programmée.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        slug: String(formData.get('slug') ?? '').trim(),
        title: { ...(editingContentPage?.title ?? {}), fr: titleText },
        body: { ...(editingContentPage?.body ?? {}), fr: bodyText },
        status,
        publish_at: status === 'scheduled' ? publishDate?.toISOString() : null,
        is_indexable: formData.get('is_indexable') === 'on',
      };
      const path = editingContentPage
        ? '/api/admin/content/pages/' + editingContentPage.id
        : '/api/admin/content/pages';
      await api<ContentPage>(path, {
        method: editingContentPage ? 'PUT' : 'POST',
        body: jsonBody(payload),
      });
      setAdminContentPages(rows(await api<Collection<ContentPage>>('/api/admin/content/pages')));
      setEditingContentPage(null);
      setNotice('Page de contenu enregistrée.');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'La page n’a pas pu être enregistrée.');
    } finally {
      setBusy(false);
    }
  }

  async function duplicateContentPage(contentPage: ContentPage): Promise<void> {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const duplicated = await api<ContentPage>(
        '/api/admin/content/pages/' + contentPage.id + '/duplicate',
        { method: 'POST' }
      );
      setAdminContentPages(rows(await api<Collection<ContentPage>>('/api/admin/content/pages')));
      setEditingContentPage(duplicated);
      setNotice('La page a été dupliquée en brouillon.');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'La page n’a pas pu être dupliquée.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteContentPage(contentPage: ContentPage): Promise<void> {
    if (!window.confirm('Supprimer cette page et ses liens de menu éventuels ?')) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api('/api/admin/content/pages/' + contentPage.id, { method: 'DELETE' });
      setAdminContentPages(rows(await api<Collection<ContentPage>>('/api/admin/content/pages')));
      setAdminContentMenus(rows(await api<Collection<ContentMenuItem>>('/api/admin/content/menu')));
      if (editingContentPage?.id === contentPage.id) setEditingContentPage(null);
      setNotice('Page supprimée.');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'La page n’a pas pu être supprimée.');
    } finally {
      setBusy(false);
    }
  }

  async function saveAdminContentMenu(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const pageIdValue = String(formData.get('page_id') ?? '');
    const parentValue = String(formData.get('parent_id') ?? '');
    const targetUrl = String(formData.get('target_url') ?? '').trim();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        label: { ...(editingMenuItem?.label ?? {}), fr: String(formData.get('label') ?? '').trim() },
        location: String(formData.get('location') ?? 'main') as ContentMenuItem['location'],
        parent_id: parentValue ? Number(parentValue) : null,
        page_id: pageIdValue ? Number(pageIdValue) : null,
        target_url: pageIdValue ? null : targetUrl || null,
        sort_order: Number(formData.get('sort_order') ?? 0),
        open_new_tab: formData.get('open_new_tab') === 'on',
      };
      const path = editingMenuItem
        ? '/api/admin/content/menu/' + editingMenuItem.id
        : '/api/admin/content/menu';
      await api<ContentMenuItem>(path, {
        method: editingMenuItem ? 'PUT' : 'POST',
        body: jsonBody(payload),
      });
      setAdminContentMenus(rows(await api<Collection<ContentMenuItem>>('/api/admin/content/menu')));
      setEditingMenuItem(null);
      setNotice('Lien de menu enregistré.');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Le lien de menu n’a pas pu être enregistré.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteContentMenuItem(menuItem: ContentMenuItem): Promise<void> {
    if (!window.confirm('Supprimer cet élément de menu et ses éventuels sous-éléments ?')) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api('/api/admin/content/menu/' + menuItem.id, { method: 'DELETE' });
      setAdminContentMenus(rows(await api<Collection<ContentMenuItem>>('/api/admin/content/menu')));
      if (editingMenuItem?.id === menuItem.id) setEditingMenuItem(null);
      setNotice('Lien de menu supprimé.');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Le lien de menu n’a pas pu être supprimé.');
    } finally {
      setBusy(false);
    }
  }

  function applyDashboardRange(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const from = String(formData.get('from') ?? '');
    const to = String(formData.get('to') ?? '');
    setDashboardRange({ from, to });
  }

  const selectedProduct =
    loadedProduct ??
    products.find((product) => String(product.id) === selectedProductId) ??
    null;
  const selectedCheckoutAddress = addresses.find(
    (address) => String(address.id) === checkoutAddressId
  );
  const adminNavigationItems: Array<{ section: AdminSection; label: string }> = [];
  if (adminRole === 'manager') adminNavigationItems.push({ section: 'dashboard', label: 'Vue d’ensemble' });
  adminNavigationItems.push({ section: 'products', label: 'Produits (' + adminProducts.length + ')' });
  if (adminRole !== 'editor') {
    adminNavigationItems.push(
      { section: 'orders', label: 'Commandes (' + adminOrders.length + ')' },
      { section: 'customers', label: 'Clients (' + adminCustomers.length + ')' },
      { section: 'unpaid', label: 'Impayées (' + unpaidOrders.length + ')' },
      { section: 'carts', label: 'Paniers (' + abandonedCarts.length + ')' },
      { section: 'returns', label: 'Retours (' + adminReturns.length + ')' }
    );
  }
  if (['manager', 'editor'].includes(adminRole ?? '')) {
    adminNavigationItems.push({ section: 'content', label: 'Contenus' });
  }

  return (
    <div className="storefront">
      <a className="skip-link" href="#main-content">Aller au contenu</a>
      {page === 'admin' && <div className="top-note admin-top-note">ESPACE DE GESTION · ACCÈS ÉQUIPE</div>}
      <header className="site-header">
        <button className="brand" type="button" onClick={() => goTo('catalog')}>
          <span className="brand-mark" aria-hidden="true">S</span>
          <span className="brand-copy">
            <span className="brand-name">{STORE_NAME}</span>
            <span className="brand-sub">{page === 'admin' ? 'Console administration' : 'Objets du quotidien'}</span>
          </span>
        </button>
        <div className="header-actions">
          <button
            className="icon-button theme-toggle"
            type="button"
            aria-label={theme === 'dark' ? 'Activer le thème clair' : 'Activer le thème sombre'}
            onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☼' : '◐'}</span>
          </button>
          <button
            className="mobile-menu-toggle"
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-controls="primary-navigation"
            aria-label={mobileMenuOpen ? 'Fermer le menu de navigation' : 'Ouvrir le menu de navigation'}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <span aria-hidden="true">{mobileMenuOpen ? '×' : '☰'}</span>
          </button>
          <button className="cart-link" type="button" onClick={() => goTo('cart')} aria-label={'Voir le panier, ' + cartCount + ' article(s)'}>
            Panier <span className="cart-count" aria-hidden="true">{cartCount}</span>
          </button>
        </div>
        <nav
          id="primary-navigation"
          className={mobileMenuOpen ? 'main-nav is-open' : 'main-nav'}
          aria-label="Navigation principale"
        >
          {mobileMenuOpen && <div className="mobile-menu-head"><strong>Navigation</strong><button className="icon-button" type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Fermer le menu">×</button></div>}
          <button type="button" aria-current={page === 'catalog' ? 'page' : undefined} onClick={() => goTo('catalog')}>La boutique</button>
          <button type="button" aria-current={page === 'account' ? 'page' : undefined} onClick={() => goTo('account')}>Mon compte</button>
          {renderMenuItems(null)}
          <button type="button" aria-current={page === 'admin' ? 'page' : undefined} onClick={() => goTo('admin')}>Administration</button>
        </nav>
      </header>
      {mobileMenuOpen && <button className="mobile-menu-backdrop" type="button" aria-label="Fermer le menu" onClick={() => setMobileMenuOpen(false)} />}

      <main id="main-content">
        {page === 'catalog' && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <p className="eyebrow">LA SÉLECTION DU MOMENT</p>
                <h1>Des essentiels<br />faits pour durer.</h1>
                <p>{STORE_DESCRIPTION || 'Découvrez une sélection pensée pour votre quotidien.'}</p>
                <button className="button button-dark" type="button" onClick={() => document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' })}>
                  Explorer la boutique
                </button>
              </div>
              <div className="hero-art" aria-hidden="true">
                <span className="art-sun" />
                <span className="art-shape art-shape-one" />
                <span className="art-shape art-shape-two" />
                <span className="art-caption">COLLECTION<br />ESSENTIELLE</span>
              </div>
            </section>

            <section className="benefits" aria-label="Les engagements de la boutique">
              <p><span aria-hidden="true">✦</span> Sélection de qualité</p>
              <p><span aria-hidden="true">↗</span> Livraison suivie</p>
              <p><span aria-hidden="true">♡</span> Paiement sécurisé</p>
            </section>

            <section id="catalogue" className="catalog-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">NOTRE BOUTIQUE</p>
                  <h2>À découvrir</h2>
                </div>
                <form
                  className="search-form"
                  role="search"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setSearch(searchInput);
                  }}
                >
                  <label className="visually-hidden" htmlFor="product-search">Rechercher un produit</label>
                  <input
                    id="product-search"
                    type="search"
                    placeholder="Rechercher un produit…"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                  />
                  <button className="button button-dark" type="submit">Rechercher</button>
                </form>
              </div>

              <div className="catalog-layout">
                <aside className="category-panel" aria-label="Catégories">
                  <h3>Catégories</h3>
                  <button className={!categoryId ? 'category-option active' : 'category-option'} type="button" onClick={() => setCategoryId('')}>Tout voir</button>
                  {categories.map((category) => (
                    <button
                      className={categoryId === String(category.id) ? 'category-option active' : 'category-option'}
                      key={category.id}
                      type="button"
                      onClick={() => setCategoryId(String(category.id))}
                    >
                      {localized(category.name)}
                    </button>
                  ))}
                </aside>

                <div className="catalog-content">
                  {featuredProducts.length > 0 && !search && !categoryId && (
                    <div className="featured-strip" aria-label="Produits à la une">
                      {featuredProducts.map((product) => (
                        <button className="featured-card" type="button" key={product.id} onClick={() => openProduct(product)}>
                          <span>{localized(product.name)}</span>
                          <span aria-hidden="true">↗</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {error && <p className="feedback error" role="alert">{error}</p>}
                  {loadingProducts ? (
                    <p className="empty-state" role="status">Chargement du catalogue…</p>
                  ) : products.length === 0 ? (
                    <p className="empty-state">Aucun produit ne correspond à votre recherche.</p>
                  ) : (
                    <div className="product-grid">
                      {products.map((product, index) => {
                        const image = imageOf(product);
                        return (
                          <article className="product-card" key={product.id}>
                            <button className={'product-image image-tone-' + (index % 4)} type="button" onClick={() => openProduct(product)} aria-label={'Découvrir ' + localized(product.name)}>
                              {image ? (
                                <img src={image.url} alt={localized(image.alt) || localized(product.name)} loading="lazy" />
                              ) : (
                                <span className="image-placeholder" aria-hidden="true">SF</span>
                              )}
                              <span className="image-open" aria-hidden="true">↗</span>
                            </button>
                            <div className="product-info">
                              <div>
                                <p className="product-sku">{product.sku}</p>
                                <button className="product-title" type="button" onClick={() => openProduct(product)}>{localized(product.name)}</button>
                              </div>
                              <p className="product-price">{money(productPrice(product), product.currency ?? currency)}</p>
                            </div>
                            <button className="button button-outline add-button" type="button" disabled={busy || product.is_sellable === false} onClick={() => void addToCart(product)}>
                              {product.is_sellable === false ? 'Indisponible' : 'Ajouter au panier'}
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="newsletter">
              <p className="eyebrow">RESTONS EN CONTACT</p>
              <h2>Un peu de nouveauté<br />dans votre boîte mail.</h2>
              <p>Les nouveautés et les actualités de {STORE_NAME}.</p>
              <button className="button button-light" type="button" onClick={() => goTo('account')}>Créer mon compte</button>
            </section>
          </>
        )}

        {page === 'product' && (
          <section className="page-section">
            <button className="back-link" type="button" onClick={() => goTo('catalog')}>← Retour à la boutique</button>
            {error && <p className="feedback error" role="alert">{error}</p>}
            {!selectedProduct ? (
              <p className="empty-state" role="status">Chargement du produit…</p>
            ) : (
              <div className="product-detail">
                <div className="detail-image">
                  {imageOf(selectedProduct) ? (
                    <img src={imageOf(selectedProduct)?.url} alt={localized(imageOf(selectedProduct)?.alt) || localized(selectedProduct.name)} />
                  ) : <span className="image-placeholder" aria-hidden="true">SF</span>}
                </div>
                <div className="detail-copy">
                  <p className="eyebrow">RÉF. {selectedProduct.sku}</p>
                  <h1>{localized(selectedProduct.name)}</h1>
                  <p className="detail-price">{money(productPrice(selectedProduct), selectedProduct.currency ?? currency)}</p>
                  <p>{localized(selectedProduct.description_long) || localized(selectedProduct.description_short) || 'Un essentiel choisi avec soin pour vous accompagner au quotidien.'}</p>
                  {selectedProduct.categories && (
                    <p className="detail-categories">{selectedProduct.categories.map((category) => localized(category.name)).join(' · ')}</p>
                  )}
                  {selectedProduct.stock_tracked && selectedProduct.available_quantity !== undefined && (
                    <p className="stock-status">{selectedProduct.available_quantity && selectedProduct.available_quantity > 0 ? 'En stock' : 'Stock épuisé'}</p>
                  )}
                  <button className="button button-dark" type="button" disabled={busy || selectedProduct.is_sellable === false} onClick={() => void addToCart(selectedProduct)}>
                    Ajouter au panier
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {page === 'content' && (
          <section className="page-section narrow-section">
            <button className="back-link" type="button" onClick={() => goTo('catalog')}>← Retour à la boutique</button>
            {publicContentLoading ? (
              <p className="empty-state" role="status">Chargement de la page…</p>
            ) : publicContentPage ? (
              <article className="content-page">
                <p className="eyebrow">INFORMATIONS DE LA BOUTIQUE</p>
                <h1>{localized(publicContentPage.title)}</h1>
                <div className="content-body">{localized(publicContentPage.body)}</div>
              </article>
            ) : (
              <div className="empty-state">
                {error ? <p className="feedback error" role="alert">{error}</p> : <p>Cette page n’est pas disponible.</p>}
                <button className="button button-outline" type="button" onClick={() => goTo('catalog')}>Revenir à la boutique</button>
              </div>
            )}
          </section>
        )}

        {page === 'cart' && (
          <section className="page-section narrow-section">
            <p className="eyebrow">VOTRE SÉLECTION</p>
            <h1>Mon panier</h1>
            {error && <p className="feedback error" role="alert">{error}</p>}
            {cartLoading ? (
              <p className="empty-state" role="status">Chargement du panier…</p>
            ) : cartLines.length === 0 ? (
              <div className="empty-state">
                <p>Votre panier est encore vide.</p>
                <button className="button button-dark" type="button" onClick={() => goTo('catalog')}>Découvrir la boutique</button>
              </div>
            ) : (
              <>
                <div className="cart-list">
                  {cartLines.map((line, index) => {
                    const product = line.product;
                    const key = String(line.product_id ?? product?.id ?? index);
                    const unitPrice = line.unit_price_incl_tax ?? product?.price_catalog ?? 0;
                    return (
                      <article className="cart-row" key={key}>
                        <div className="cart-product">
                          <strong>{localized(product?.name ?? line.name) || 'Produit'}</strong>
                          <span>{line.sku ?? product?.sku ?? ''}</span>
                        </div>
                        <div className="quantity-control" aria-label={'Quantité de ' + (localized(product?.name ?? line.name) || 'produit')}>
                          <button type="button" aria-label="Diminuer la quantité" disabled={busy} onClick={() => void changeQuantity(line, line.quantity - 1)}>−</button>
                          <span aria-live="polite">{line.quantity}</span>
                          <button type="button" aria-label="Augmenter la quantité" disabled={busy} onClick={() => void changeQuantity(line, line.quantity + 1)}>+</button>
                        </div>
                        <strong>{money(line.total_incl_tax ?? unitPrice * line.quantity, currency)}</strong>
                      </article>
                    );
                  })}
                </div>
                <div className="cart-summary">
                  <p><span>Total estimé</span><strong>{money(subtotal, currency)}</strong></p>
                  <p className="muted">Les frais de livraison et le total définitif seront calculés à la commande.</p>
                  <button className="button button-dark button-wide" type="button" onClick={() => goTo('checkout')}>Passer la commande</button>
                </div>
              </>
            )}
          </section>
        )}

        {page === 'checkout' && (
          <section className="page-section narrow-section">
            <p className="eyebrow">DERNIÈRE ÉTAPE</p>
            <h1>Finaliser ma commande</h1>
            {!authenticated && (
              <div className="feedback info">
                La création d’un compte client est obligatoire pour commander.{' '}
                <button className="inline-link" type="button" onClick={() => goTo('account')}>Me connecter ou créer un compte</button>
              </div>
            )}
            {error && <p className="feedback error" role="alert">{error}</p>}
            {notice && <p className="feedback success" role="status">{notice}</p>}
            <form className="form-card" onSubmit={(event) => void submitCheckout(event)}>
              <fieldset disabled={!authenticated || busy}>
                <legend>Adresse de livraison</legend>
                <label className="full-field">
                  Adresse enregistrée
                  <select
                    value={checkoutAddressId}
                    onChange={(event) => setCheckoutAddressId(event.target.value)}
                  >
                    <option value="">Saisir une nouvelle adresse</option>
                    {addresses
                      .filter((address) => address.address_type !== 'billing')
                      .map((address) => (
                        <option key={address.id} value={address.id}>
                          {address.recipient} — {address.street1}, {address.zip} {address.city}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="form-grid">
                  <label>Prénom<input name="first_name" autoComplete="given-name" required={!selectedCheckoutAddress} disabled={Boolean(selectedCheckoutAddress)} /></label>
                  <label>Nom<input name="last_name" autoComplete="family-name" required={!selectedCheckoutAddress} disabled={Boolean(selectedCheckoutAddress)} /></label>
                  <label className="full-field">Adresse e-mail<input name="email" type="email" autoComplete="email" required /></label>
                  <label className="full-field">Téléphone<input name="phone" type="tel" autoComplete="tel" required /></label>
                  <label className="full-field">Adresse<input name="address_line1" autoComplete="street-address" defaultValue={selectedCheckoutAddress?.street1 ?? ''} required={!selectedCheckoutAddress} disabled={Boolean(selectedCheckoutAddress)} /></label>
                  <label>Code postal<input name="postal_code" autoComplete="postal-code" defaultValue={selectedCheckoutAddress?.zip ?? ''} required={!selectedCheckoutAddress} disabled={Boolean(selectedCheckoutAddress)} /></label>
                  <label>Ville<input name="city" autoComplete="address-level2" defaultValue={selectedCheckoutAddress?.city ?? ''} required={!selectedCheckoutAddress} disabled={Boolean(selectedCheckoutAddress)} /></label>
                  <label className="full-field">Pays<input name="country" autoComplete="country-name" defaultValue={selectedCheckoutAddress?.country ?? 'France'} required={!selectedCheckoutAddress} disabled={Boolean(selectedCheckoutAddress)} /></label>
                </div>
              </fieldset>
              <label>
                Mode de livraison
                <select
                  value={shippingMethodId}
                  onChange={(event) => setShippingMethodId(event.target.value)}
                  disabled={!authenticated || busy || shippingMethods.length === 0}
                  required={shippingMethods.length > 0}
                >
                  {shippingMethods.length === 0 && <option value="">Aucun mode disponible</option>}
                  {shippingMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {localized(method.name)} —{' '}
                      {method.fixed_price !== null && method.fixed_price !== undefined
                        ? money(method.fixed_price, method.currency)
                        : 'tarif calculé à la commande'}
                      {method.free_over_amount !== null && method.free_over_amount !== undefined
                        ? ' · gratuit dès ' + money(method.free_over_amount, method.currency)
                        : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Code promotionnel
                <input
                  value={promotionCode}
                  onChange={(event) => setPromotionCode(event.target.value)}
                  disabled={!authenticated || busy}
                  autoComplete="off"
                />
              </label>
              <div className="checkout-total"><span>Total estimé</span><strong>{money(subtotal, currency)}</strong></div>
              <button className="button button-dark button-wide" type="submit" disabled={!authenticated || busy || cartLines.length === 0}>
                {busy ? 'Commande en cours…' : 'Confirmer ma commande'}
              </button>
              <p className="muted">Le paiement de démonstration est traité par le serveur de la boutique.</p>
            </form>
          </section>
        )}

        {page === 'account' && (
          <section className="page-section narrow-section">
            <p className="eyebrow">ESPACE CLIENT</p>
            <h1>Mon compte</h1>
            {error && <p className="feedback error" role="alert">{error}</p>}
            {notice && <p className="feedback success" role="status">{notice}</p>}
            {!authenticated ? (
              <div className="form-card">
                <div className="form-tabs" role="tablist" aria-label="Accès au compte">
                  <button type="button" role="tab" aria-selected={authMode === 'login'} onClick={() => setAuthMode('login')}>Connexion</button>
                  <button type="button" role="tab" aria-selected={authMode === 'register'} onClick={() => setAuthMode('register')}>Créer un compte</button>
                </div>
                <form onSubmit={(event) => void submitAuth(event)}>
                  {authMode === 'register' && (
                    <div className="form-grid">
                      <label>Prénom<input name="first_name" autoComplete="given-name" required /></label>
                      <label>Nom<input name="last_name" autoComplete="family-name" required /></label>
                    </div>
                  )}
                  <label>Adresse e-mail<input name="email" type="email" autoComplete="email" required /></label>
                  <label>Mot de passe<input name="password" type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} minLength={8} required /></label>
                  <button className="button button-dark button-wide" type="submit" disabled={busy}>{busy ? 'Veuillez patienter…' : authMode === 'login' ? 'Me connecter' : 'Créer mon compte'}</button>
                </form>
              </div>
            ) : (
              <>
                <div className="account-toolbar">
                  <p>Retrouvez ici le suivi de vos commandes et leur état.</p>
                  <button className="button button-outline" type="button" onClick={signOut}>Me déconnecter</button>
                </div>
                <section className="admin-section" aria-labelledby="customer-addresses-heading">
                  <h2 id="customer-addresses-heading">Mes adresses</h2>
                  <form
                    key={editingAddress?.id ?? 'new-address'}
                    className="form-card"
                    onSubmit={(event) => void submitAddress(event)}
                  >
                    <div className="form-grid">
                      <label>
                        Type d’adresse
                        <select name="address_type" defaultValue={editingAddress?.address_type ?? 'both'}>
                          <option value="both">Facturation et livraison</option>
                          <option value="shipping">Livraison</option>
                          <option value="billing">Facturation</option>
                        </select>
                      </label>
                      <label>Destinataire<input name="recipient" defaultValue={editingAddress?.recipient ?? ''} autoComplete="name" required /></label>
                      <label className="full-field">Adresse<input name="street1" defaultValue={editingAddress?.street1 ?? ''} autoComplete="street-address" required /></label>
                      <label className="full-field">Complément d’adresse<input name="street2" defaultValue={editingAddress?.street2 ?? ''} autoComplete="address-line2" /></label>
                      <label>Code postal<input name="zip" defaultValue={editingAddress?.zip ?? ''} autoComplete="postal-code" required /></label>
                      <label>Ville<input name="city" defaultValue={editingAddress?.city ?? ''} autoComplete="address-level2" required /></label>
                      <label>Pays (code ISO)<input name="country" defaultValue={editingAddress?.country ?? 'FR'} autoComplete="country" maxLength={2} required /></label>
                      <label>Région<input name="region" defaultValue={editingAddress?.region ?? ''} autoComplete="address-level1" /></label>
                    </div>
                    <div className="account-toolbar">
                      <button className="button button-dark" type="submit" disabled={busy}>
                        {editingAddress ? 'Enregistrer les modifications' : 'Ajouter cette adresse'}
                      </button>
                      {editingAddress && (
                        <button className="button button-outline" type="button" onClick={() => setEditingAddress(null)}>
                          Annuler
                        </button>
                      )}
                    </div>
                  </form>
                  {addresses.length === 0 ? (
                    <p className="empty-state">Aucune adresse enregistrée.</p>
                  ) : (
                    <div className="order-list">
                      {addresses.map((address) => (
                        <article className="order-row" key={address.id}>
                          <div className="order-main">
                            <div>
                              <strong>{address.recipient}</strong>
                              <span>{address.street1}{address.street2 ? ', ' + address.street2 : ''}</span>
                              <span>{address.zip} {address.city} · {address.country}</span>
                            </div>
                            <span className="status-pill">{address.address_type}</span>
                          </div>
                          <div className="account-toolbar">
                            <button className="button button-outline" type="button" onClick={() => setEditingAddress(address)}>Modifier</button>
                            <button className="button button-outline" type="button" disabled={busy} onClick={() => void deleteAddress(address)}>Supprimer</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
                {customerLoading ? (
                  <p className="empty-state" role="status">Chargement de vos commandes et retours…</p>
                ) : orders.length === 0 ? (
                  <p className="empty-state">Aucune commande pour le moment.</p>
                ) : (
                  <div className="order-list">
                    {orders.map((order, index) => (
                      <article className="order-row" key={order.id ?? displayOrderNumber(order) + index}>
                        <div className="order-main">
                          <div>
                            <strong>Commande {displayOrderNumber(order)}</strong>
                            <span>{order.placed_at ?? order.created_at ? new Date(order.placed_at ?? order.created_at ?? '').toLocaleDateString('fr-FR') : 'Date non précisée'}</span>
                          </div>
                          <span className="status-pill">{order.status}</span>
                          <strong>{money(order.total_incl_tax ?? order.total, order.currency ?? currency)}</strong>
                        </div>
                        {['confirmed', 'shipped', 'delivered'].includes(order.status) && (
                          <button
                            className="button button-outline"
                            type="button"
                            disabled={busy}
                            onClick={() => void downloadDocument(
                              '/api/customer/orders/' + encodeURIComponent(displayOrderNumber(order)) + '/documents/confirmation'
                            )}
                          >
                            Télécharger la confirmation PDF
                          </button>
                        )}
                        {['ready', 'shipped', 'delivered'].includes(order.shipment_status ?? '') && (
                          <button
                            className="button button-outline"
                            type="button"
                            disabled={busy}
                            onClick={() => void downloadDocument(
                              '/api/customer/orders/' + encodeURIComponent(displayOrderNumber(order)) + '/documents/delivery'
                            )}
                          >
                            Télécharger le document de livraison
                          </button>
                        )}
                        <button className="button button-outline" type="button" disabled title="Une juridiction et des règles fiscales doivent être définies avant de générer ces documents.">
                          Facture, pro forma et avoir indisponibles
                        </button>
                        {order.status === 'delivered' && (
                          <form className="return-form" onSubmit={(event) => void requestReturn(event, order)}>
                            <label>
                              Motif du retour
                              <input
                                value={returnReasons[displayOrderNumber(order)] ?? ''}
                                onChange={(event) =>
                                  setReturnReasons((current) => ({
                                    ...current,
                                    [displayOrderNumber(order)]: event.target.value,
                                  }))
                                }
                                required
                              />
                            </label>
                            <button className="button button-outline" type="submit" disabled={busy}>
                              Demander un retour
                            </button>
                          </form>
                        )}
                      </article>
                    ))}
                  </div>
                )}
                <section className="admin-section" aria-labelledby="customer-returns-heading">
                  <h2 id="customer-returns-heading">Mes retours</h2>
                  {customerLoading ? (
                    <p className="empty-state" role="status">Chargement…</p>
                  ) : customerReturns.length === 0 ? (
                    <p className="empty-state">Aucune demande de retour.</p>
                  ) : (
                    <div className="order-list">
                      {customerReturns.map((returnRequest) => (
                        <article className="order-row" key={returnRequest.id}>
                          <div className="order-main">
                            <strong>Commande {returnRequest.order_number}</strong>
                            <span className="status-pill">{returnRequest.status}</span>
                            <span>{returnRequest.reason}</span>
                          </div>
                          {returnRequest.status === 'closed' && returnRequest.successful_refund_count > 0 && (
                            <button
                              className="button button-outline"
                              type="button"
                              disabled={busy}
                              onClick={() => void downloadDocument(
                                '/api/customer/returns/' + returnRequest.id + '/documents/refund'
                              )}
                            >
                              Télécharger le justificatif de remboursement
                            </button>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </section>
        )}

        {page === 'admin' && (
          <section className="page-section admin-page-section">
            <p className="eyebrow">ESPACE DE GESTION</p>
            <h1>Administration</h1>
            <p className="muted">Vue de suivi des produits et des commandes. Les droits sont contrôlés par le serveur.</p>
            {error && <p className="feedback error" role="alert">{error}</p>}
            {!adminAuthenticated ? (
              <form className="form-card" onSubmit={(event) => void submitAdminAuth(event)}>
                <h2>Connexion administrateur</h2>
                <label>Adresse e-mail<input name="email" type="email" autoComplete="username" required /></label>
                <label>Mot de passe<input name="password" type="password" autoComplete="current-password" required /></label>
                <button className="button button-dark" type="submit" disabled={busy}>
                  {busy ? 'Connexion…' : 'Se connecter'}
                </button>
              </form>
            ) : (
              <>
                <div className="account-toolbar">
                  <span>Session administrateur active.</span>
                  <button className="button button-outline" type="button" onClick={adminSignOut}>
                    Se déconnecter
                  </button>
                </div>
                <div className="admin-workspace">
                  <aside className="admin-sidebar" aria-label="Navigation d’administration">
                    <span className="admin-sidebar-label">ESPACE DE TRAVAIL</span>
                    {adminNavigationItems.map((item) => (
                      <button
                        className={adminSection === item.section ? 'active' : ''}
                        type="button"
                        key={item.section}
                        aria-current={adminSection === item.section ? 'page' : undefined}
                        onClick={() => setAdminSection(item.section)}
                      >
                        {item.label}
                      </button>
                    ))}
                    <button className="admin-sidebar-store" type="button" onClick={() => goTo('catalog')}>← Voir la boutique</button>
                  </aside>
                  <div className="admin-main-content">
                    {adminLoading && <p className="empty-state" role="status">Chargement des données d’administration…</p>}
            {adminSection === 'dashboard' && adminRole === 'manager' && (
              <section className="admin-section" aria-labelledby="dashboard-heading" aria-busy={dashboardLoading}>
                <h2 id="dashboard-heading">Vue d’ensemble</h2>
                <form className="dashboard-range" onSubmit={applyDashboardRange}>
                  <label>Début UTC<input name="from" type="date" value={dashboardFromDraft} onChange={(event) => setDashboardFromDraft(event.target.value)} required /></label>
                  <label>Fin UTC exclue<input name="to" type="date" value={dashboardToDraft} onChange={(event) => setDashboardToDraft(event.target.value)} required /></label>
                  <button className="button button-dark" type="submit" disabled={dashboardLoading}>Actualiser</button>
                </form>
                {dashboardLoading ? (
                  <p className="empty-state" role="status">Calcul des indicateurs…</p>
                ) : adminDashboard ? (
                  <>
                    <p className="muted">Période UTC semi-ouverte : {adminDashboard.from} inclus, {adminDashboard.to} exclu.</p>
                    <div className="dashboard-metrics">
                      <article><span>Commandes confirmées</span><strong>{adminDashboard.order_count}</strong></article>
                      <article><span>Ventes TTC par devise</span><strong>{adminDashboard.sales_by_currency.length === 0 ? money(0, currency) : adminDashboard.sales_by_currency.map((item) => money(item.sales_ttc, item.currency)).join(' · ')}</strong></article>
                      <article><span>Panier moyen TTC par devise</span><strong>{adminDashboard.sales_by_currency.length === 0 ? money(0, currency) : adminDashboard.sales_by_currency.map((item) => money(item.average_order_value_ttc, item.currency)).join(' · ')}</strong></article>
                      <article><span>Retours clôturés</span><strong>{adminDashboard.closed_return_count}</strong></article>
                      <article><span>Remboursements réussis</span><strong>{adminDashboard.successful_refund_count}{adminDashboard.refunded_amounts_by_currency.length > 0 ? ' · ' + adminDashboard.refunded_amounts_by_currency.map((item) => money(item.refunded_amount, item.currency)).join(' · ') : ''}</strong></article>
                      <article><span>Alertes de stock</span><strong>{adminDashboard.stock_alert_count}</strong></article>
                    </div>
                    <div className="dashboard-columns">
                      <section>
                        <h3>Produits les plus vendus</h3>
                        {adminDashboard.top_products.length === 0 ? <p className="empty-state">Aucune vente sur cette période.</p> : (
                          <div className="table-scroll"><table>
                            <thead><tr><th>SKU</th><th>Produit</th><th>Unités</th><th>Ventes TTC</th></tr></thead>
                            <tbody>{adminDashboard.top_products.map((item) => (
                              <tr key={item.sku + '-' + item.currency}><td>{item.sku}</td><td>{localized(item.name)}</td><td>{item.units_sold}</td><td>{money(item.sales, item.currency)}</td></tr>
                            ))}</tbody>
                          </table></div>
                        )}
                      </section>
                      <section>
                        <h3>Stock à surveiller</h3>
                        {adminDashboard.stock_alerts.length === 0 ? <p className="empty-state">Aucune alerte de stock.</p> : (
                          <div className="table-scroll"><table>
                            <thead><tr><th>SKU</th><th>Produit</th><th>Disponible</th><th>Seuil</th></tr></thead>
                            <tbody>{adminDashboard.stock_alerts.map((item) => (
                              <tr key={item.product_id}><td>{item.sku}</td><td>{localized(item.name)}</td><td>{item.available}</td><td>{item.alert_threshold}</td></tr>
                            ))}</tbody>
                          </table></div>
                        )}
                      </section>
                    </div>
                    <p className="muted">Formules : ventes TTC = somme des totaux figés des commandes confirmées, expédiées ou livrées ; panier moyen = ventes / commandes ; retours par date de clôture ; remboursements réussis par date de transaction. Les lignes de livraison sont exclues des produits principaux.</p>
                  </>
                ) : <p className="empty-state">Aucune statistique disponible.</p>}
              </section>
            )}
            {adminSection === 'products' && <section id="admin-products" className="admin-section">
              <h2>Produits</h2>
              {adminProducts.length === 0 ? <p className="muted">Aucun produit à afficher ou accès refusé.</p> : (
                <div className="table-scroll">
                  <table>
                    <thead><tr><th>SKU</th><th>Produit</th><th>Prix</th><th>État</th><th>Gestion</th></tr></thead>
                    <tbody>{adminProducts.map((product) => (
                      <tr key={product.id}>
                        <td>{product.sku}</td>
                        <td>{localized(product.name)}</td>
                        <td>{money(product.price_catalog, product.currency ?? currency)}</td>
                        <td>{product.is_sellable === false ? 'Indisponible' : 'Vendable'}</td>
                        <td>
                          <form className="admin-product-form" onSubmit={(event) => void updateAdminProduct(event, product)}>
                            {['manager', 'operator'].includes(adminRole ?? '') && (
                              <>
                                <label>Prix en unités mineures<input name="price_catalog" type="number" min="0" step="1" defaultValue={product.price_catalog} required /></label>
                                <label>Stock<input name="quantity_on_hand" type="number" min="0" step="1" defaultValue={product.quantity_on_hand ?? 0} required /></label>
                                <label>Seuil d’alerte<input name="alert_threshold" type="number" min="0" step="1" defaultValue={product.alert_threshold ?? 5} required /></label>
                              </>
                            )}
                            <label><input name="is_sellable" type="checkbox" defaultChecked={product.is_sellable !== false} /> Vendable</label>
                            <label><input name="is_published" type="checkbox" defaultChecked={product.is_published === true} /> Publié</label>
                            <button className="button button-outline" type="submit" disabled={busy}>Enregistrer</button>
                          </form>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </section>}
            {adminRole !== 'editor' && (
              <>
            {adminSection === 'orders' && <section id="admin-orders" className="admin-section">
              <h2>Commandes</h2>
              {adminOrders.length === 0 ? <p className="muted">Aucune commande à afficher ou accès refusé.</p> : (
                <div className="table-scroll">
                  <table>
                    <thead><tr><th>Référence</th><th>État</th><th>Livraison</th><th>Paiement</th><th>Total</th><th>Action</th></tr></thead>
                    <tbody>{adminOrders.map((order, index) => (
                      <tr key={order.id ?? displayOrderNumber(order) + index}>
                        <td>{displayOrderNumber(order)}</td>
                        <td>{order.status}</td>
                        <td>{order.shipment_status ?? '—'}</td>
                        <td>{order.payment_status ?? '—'}</td>
                        <td>{money(order.total_incl_tax ?? order.total, order.currency ?? currency)}</td>
                        <td>
                          {['confirmed', 'shipped', 'delivered'].includes(order.status) && (
                            <button className="button button-outline" disabled={busy} onClick={() => void downloadDocument('/api/admin/orders/' + encodeURIComponent(displayOrderNumber(order)) + '/documents/confirmation')}>Confirmation PDF</button>
                          )}
                          {['ready', 'shipped', 'delivered'].includes(order.shipment_status ?? '') && (
                            <button className="button button-outline" disabled={busy} onClick={() => void downloadDocument('/api/admin/orders/' + encodeURIComponent(displayOrderNumber(order)) + '/documents/delivery')}>Livraison PDF</button>
                          )}
                          <button className="button button-outline" type="button" disabled title="Une juridiction et des règles fiscales doivent être définies avant de générer ces documents.">
                            Facture, pro forma et avoir indisponibles
                          </button>
                          {order.shipment_status === 'pending' && (
                            <button className="button button-outline" disabled={busy} onClick={() => void advanceShipment(order, 'ready')}>Préparer</button>
                          )}
                          {order.shipment_status === 'ready' && (
                            <button className="button button-outline" disabled={busy} onClick={() => void advanceShipment(order, 'shipped')}>Expédier</button>
                          )}
                          {order.shipment_status === 'shipped' && (
                            <button className="button button-outline" disabled={busy} onClick={() => void advanceShipment(order, 'delivered')}>Marquer livré</button>
                          )}
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </section>}
            {adminSection === 'returns' && <section id="admin-returns" className="admin-section">
              <h2>Retours et remboursements</h2>
              {adminReturns.length === 0 ? <p className="muted">Aucune demande de retour.</p> : (
                <div className="order-list">
                  {adminReturns.map((returnRequest) => (
                    <article className="order-row" key={returnRequest.id}>
                      <div className="order-main">
                        <div>
                          <strong>Commande {returnRequest.order_number}</strong>
                          <span>{returnRequest.customer_email}</span>
                        </div>
                        <span className="status-pill">{returnRequest.status}</span>
                        <span>{returnRequest.reason}</span>
                      </div>
                      {returnRequest.status === 'requested' && (
                        <div className="admin-actions">
                          <button className="button button-outline" disabled={busy} onClick={() => void processAdminReturn(returnRequest, 'approve')}>Approuver</button>
                          <label>
                            Motif du refus
                            <input
                              value={adminRefusalReasons[returnRequest.id] ?? ''}
                              onChange={(event) => setAdminRefusalReasons((current) => ({
                                ...current,
                                [returnRequest.id]: event.target.value,
                              }))}
                            />
                          </label>
                          <button
                            className="button button-outline"
                            disabled={busy || !(adminRefusalReasons[returnRequest.id] ?? '').trim()}
                            onClick={() => void processAdminReturn(returnRequest, 'reject')}
                          >
                            Refuser
                          </button>
                        </div>
                      )}
                      {returnRequest.status === 'approved' && (
                        <button className="button button-dark" disabled={busy} onClick={() => void processAdminReturn(returnRequest, 'receive')}>
                          Recevoir, remettre en stock et rembourser
                        </button>
                      )}
                      {returnRequest.status === 'closed' && (returnRequest.successful_refund_count ?? 0) > 0 && (
                        <button className="button button-outline" disabled={busy} onClick={() => void downloadDocument('/api/admin/returns/' + returnRequest.id + '/documents/refund')}>
                          Télécharger le justificatif PDF
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>}
            {adminSection === 'customers' && <section className="admin-section">
              <h2>Clients</h2>
              {adminLoading ? <p className="empty-state" role="status">Chargement des clients…</p> : adminCustomers.length === 0 ? <p className="empty-state">Aucun client à afficher.</p> : (
                <div className="table-scroll"><table>
                  <thead><tr><th>Client</th><th>E-mail</th><th>Langue</th><th>Commandes</th><th>Compte</th><th>Inscription</th></tr></thead>
                  <tbody>{adminCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td>{customer.full_name}</td><td>{customer.email}</td><td>{customer.locale}</td>
                      <td>{customer.order_count}</td><td>{customer.is_active ? 'Actif' : 'Désactivé'}</td>
                      <td>{new Date(customer.created_at).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  ))}</tbody>
                </table></div>
              )}
            </section>}
            {adminSection === 'unpaid' && <section className="admin-section">
              <h2>Commandes impayées</h2>
              {adminLoading ? <p className="empty-state" role="status">Chargement des commandes…</p> : unpaidOrders.length === 0 ? <p className="empty-state">Aucune commande en attente de paiement.</p> : (
                <div className="table-scroll"><table>
                  <thead><tr><th>Référence</th><th>Client</th><th>E-mail</th><th>Paiement</th><th>Total</th></tr></thead>
                  <tbody>{unpaidOrders.map((order) => (
                    <tr key={order.order_number}>
                      <td>{order.order_number}</td><td>{order.customer_name}</td><td>{order.customer_email}</td>
                      <td>{order.payment_status}</td><td>{money(order.total, order.currency)}</td>
                    </tr>
                  ))}</tbody>
                </table></div>
              )}
            </section>}
            {adminSection === 'carts' && <section className="admin-section">
              <h2>Paniers abandonnés</h2>
              <p className="muted">La mise en file crée une notification interne en attente ; aucun courriel n’est envoyé.</p>
              {adminLoading ? <p className="empty-state" role="status">Chargement des paniers…</p> : abandonedCarts.length === 0 ? <p className="empty-state">Aucun panier abandonné éligible.</p> : (
                <div className="table-scroll"><table>
                  <thead><tr><th>Client</th><th>E-mail</th><th>Articles</th><th>Sous-total</th><th>Dernière activité</th><th>Action</th></tr></thead>
                  <tbody>{abandonedCarts.map((cartItem) => (
                    <tr key={cartItem.id}>
                      <td>{cartItem.customer_name}</td><td>{cartItem.customer_email}</td>
                      <td>{cartItem.line_count}</td><td>{money(cartItem.subtotal, cartItem.currency)}</td>
                      <td>{new Date(cartItem.updated_at).toLocaleString('fr-FR')}</td>
                      <td><button className="button button-outline" type="button" disabled={busy} onClick={() => void queueRecoveryNotification(cartItem)}>Mettre la notification en file</button></td>
                    </tr>
                  ))}</tbody>
                </table></div>
              )}
            </section>}
              </>
            )}
            {adminSection === 'content' && ['manager', 'editor'].includes(adminRole ?? '') && (
              <section className="admin-section content-admin" aria-labelledby="content-admin-heading">
                <h2 id="content-admin-heading">Pages et menus</h2>
                <p className="muted">Le contenu est enregistré comme texte/Markdown et rendu sans HTML brut. Les exemples juridiques doivent être complétés et validés avant publication.</p>
                <div className="content-admin-grid">
                  <section>
                    <h3>Pages</h3>
                    <button className="button button-outline" type="button" onClick={() => setEditingContentPage(null)}>Nouvelle page</button>
                    {adminLoading ? <p className="empty-state" role="status">Chargement…</p> : adminContentPages.length === 0 ? <p className="empty-state">Aucune page de contenu.</p> : (
                      <div className="content-page-list">
                        {adminContentPages.map((contentPage) => (
                          <article className="content-admin-row" key={contentPage.id}>
                            <button className="inline-link" type="button" onClick={() => setEditingContentPage(contentPage)}>
                              {localized(contentPage.title)} · /{contentPage.slug}
                            </button>
                            <span className="status-pill">{contentPage.status}</span>
                            <div className="admin-actions">
                              <button className="button button-outline" type="button" disabled={busy} onClick={() => void duplicateContentPage(contentPage)}>Dupliquer</button>
                              <button className="button button-outline" type="button" disabled={busy} onClick={() => void deleteContentPage(contentPage)}>Supprimer</button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                  <section>
                    <h3>{editingContentPage ? 'Modifier une page' : 'Créer une page'}</h3>
                    <form
                      key={editingContentPage?.id ?? 'new-content-page'}
                      className="form-card content-form"
                      onSubmit={(event) => void saveAdminContentPage(event)}
                    >
                      <label>Slug<input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={160} defaultValue={editingContentPage?.slug ?? ''} required /></label>
                      <label>Titre<input name="title" defaultValue={localized(editingContentPage?.title)} maxLength={200} required /></label>
                      <label>Contenu (texte ou Markdown)<textarea name="body" rows={8} maxLength={20000} defaultValue={localized(editingContentPage?.body)} required /></label>
                      <label>Publication
                        <select name="status" defaultValue={editingContentPage?.status ?? 'draft'}>
                          <option value="draft">Brouillon</option>
                          <option value="published">Publié</option>
                          <option value="scheduled">Programmé</option>
                        </select>
                      </label>
                      <label>Publication programmée<input name="publish_at" type="datetime-local" defaultValue={localDateTimeInput(editingContentPage?.publish_at)} /></label>
                      <label className="checkbox-field"><input name="is_indexable" type="checkbox" defaultChecked={editingContentPage?.is_indexable ?? true} /> Indexable par les moteurs de recherche</label>
                      <div className="admin-actions">
                        <button className="button button-dark" type="submit" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer la page'}</button>
                        {editingContentPage && <button className="button button-outline" type="button" onClick={() => setEditingContentPage(null)}>Nouvelle page</button>}
                      </div>
                    </form>
                  </section>
                </div>
                <section className="admin-section">
                  <h3>Navigation</h3>
                  <p className="muted">Les entrées peuvent cibler une page, une URL HTTP(S) ou servir de groupe parent. Les sous-éléments conservent leur emplacement.</p>
                  <div className="content-admin-grid">
                    <div className="content-page-list">
                      {adminContentMenus.length === 0 ? <p className="empty-state">Aucun lien de menu configuré.</p> : adminContentMenus.map((menuItem) => (
                        <article className="content-admin-row" key={menuItem.id}>
                          <div>
                            <strong>{localized(menuItem.label)}</strong>
                            <span className="muted">{menuItem.location}{menuItem.parent_id ? ' · sous-menu #' + menuItem.parent_id : ''} · {menuItem.page_slug ? '/' + menuItem.page_slug : menuItem.target_url ?? 'groupe'}</span>
                          </div>
                          <div className="admin-actions">
                            <button className="button button-outline" type="button" onClick={() => setEditingMenuItem(menuItem)}>Modifier</button>
                            <button className="button button-outline" type="button" disabled={busy} onClick={() => void deleteContentMenuItem(menuItem)}>Supprimer</button>
                          </div>
                        </article>
                      ))}
                    </div>
                    <form
                      key={editingMenuItem?.id ?? 'new-content-menu'}
                      className="form-card content-form"
                      onSubmit={(event) => void saveAdminContentMenu(event)}
                    >
                      <h4>{editingMenuItem ? 'Modifier un lien' : 'Ajouter un lien'}</h4>
                      <label>Libellé<input name="label" defaultValue={localized(editingMenuItem?.label)} maxLength={200} required /></label>
                      <label>Emplacement
                        <select name="location" defaultValue={editingMenuItem?.location ?? 'main'}>
                          <option value="main">Navigation principale</option>
                          <option value="footer-shop">Pied de page · boutique</option>
                          <option value="footer-service">Pied de page · service</option>
                          <option value="footer-legal">Pied de page · mentions</option>
                        </select>
                      </label>
                      <label>Page interne
                        <select name="page_id" defaultValue={editingMenuItem?.page_id ?? ''}>
                          <option value="">Aucune (groupe ou URL)</option>
                          {adminContentPages.map((contentPage) => (
                            <option key={contentPage.id} value={contentPage.id}>{localized(contentPage.title)} · /{contentPage.slug}</option>
                          ))}
                        </select>
                      </label>
                      <label>URL externe (HTTP ou HTTPS)<input name="target_url" type="url" defaultValue={editingMenuItem?.target_url ?? ''} /></label>
                      <label>Élément parent
                        <select name="parent_id" defaultValue={editingMenuItem?.parent_id ?? ''}>
                          <option value="">Aucun</option>
                          {adminContentMenus.filter((item) => item.id !== editingMenuItem?.id).map((item) => (
                            <option key={item.id} value={item.id}>{item.location} · {localized(item.label)}</option>
                          ))}
                        </select>
                      </label>
                      <label>Ordre<input name="sort_order" type="number" step="1" defaultValue={editingMenuItem?.sort_order ?? 0} required /></label>
                      <label className="checkbox-field"><input name="open_new_tab" type="checkbox" defaultChecked={editingMenuItem?.open_new_tab ?? false} /> Ouvrir dans un nouvel onglet</label>
                      <div className="admin-actions">
                        <button className="button button-dark" type="submit" disabled={busy}>Enregistrer le menu</button>
                        {editingMenuItem && <button className="button button-outline" type="button" onClick={() => setEditingMenuItem(null)}>Nouveau lien</button>}
                      </div>
                    </form>
                  </div>
                </section>
              </section>
            )}
                  </div>
                </div>
              </>
            )}
          </section>
        )}
      </main>

      <footer className={page === 'admin' ? 'site-footer admin-footer' : 'site-footer'}>
        {page === 'admin' ? (
          <div className="admin-footer-inner">
            <span>{STORE_NAME} · Console d’administration</span>
            <span>Les changements sont gérés par l’API du projet.</span>
          </div>
        ) : (
          <div className="footer-wrap">
            <div className="footer-grid">
              <section className="footer-brand-block" aria-label={STORE_NAME}>
                <button className="brand footer-brand" type="button" onClick={() => goTo('catalog')}>
                  <span className="brand-mark" aria-hidden="true">S</span>
                  <span className="brand-copy"><span className="brand-name">{STORE_NAME}</span><span className="brand-sub">Objets du quotidien</span></span>
                </button>
                <p>{STORE_DESCRIPTION || 'Une sélection pensée pour accompagner le quotidien.'}</p>
                <span className="footer-signature">Une sélection choisie avec soin.</span>
              </section>
              <nav className="footer-column" aria-label="La boutique">
                <h2 className="footer-heading">La boutique</h2>
                <div className="footer-links">
                  <button type="button" onClick={() => goTo('catalog')}>Tous les produits</button>
                  {renderFooterMenuItems('footer-shop')}
                </div>
              </nav>
              <nav className="footer-column" aria-label="Service client">
                <h2 className="footer-heading">Service client</h2>
                <div className="footer-links">
                  <button type="button" onClick={() => goTo('account')}>Mes commandes</button>
                  {renderFooterMenuItems('footer-service')}
                </div>
              </nav>
              <nav className="footer-column footer-legal-column" aria-label="Informations">
                <h2 className="footer-heading">Informations</h2>
                <div className="footer-links">
                  {renderFooterMenuItems('footer-legal')}
                  <button className="footer-team-access" type="button" onClick={() => goTo('admin')}>Accès équipe · Administration</button>
                </div>
              </nav>
            </div>
            <div className="footer-bottom">
              <span>© {new Date().getFullYear()} {STORE_NAME}</span>
              <span>Prototype de projet · Contenus à valider avant publication.</span>
            </div>
          </div>
        )}
      </footer>

      {page === 'admin' && adminAuthenticated ? (
        <nav className="mobile-bottom-nav admin-mobile-nav" aria-label="Navigation mobile administration">
          {adminNavigationItems.map((item) => (
            <button type="button" key={item.section} aria-current={adminSection === item.section ? 'page' : undefined} onClick={() => setAdminSection(item.section)}>
              <span className="mobile-nav-icon" aria-hidden="true">{item.section === 'dashboard' ? '⌂' : item.section === 'products' ? '◇' : item.section === 'orders' ? '▤' : item.section === 'customers' ? '♙' : item.section === 'returns' ? '↶' : item.section === 'content' ? '¶' : '•'}</span>
              <span>{item.label.replace(/\\s\\(\\d+\\)$/, '')}</span>
            </button>
          ))}
          <button type="button" onClick={() => goTo('catalog')}><span className="mobile-nav-icon" aria-hidden="true">↗</span><span>Boutique</span></button>
        </nav>
      ) : (
        <nav className="mobile-bottom-nav" aria-label="Navigation mobile">
          <button type="button" aria-current={page === 'catalog' ? 'page' : undefined} onClick={() => goTo('catalog')}><span className="mobile-nav-icon" aria-hidden="true">⌂</span><span>Boutique</span></button>
          <button type="button" aria-current={page === 'cart' ? 'page' : undefined} onClick={() => goTo('cart')}><span className="mobile-nav-icon" aria-hidden="true">◇</span><span>Panier</span></button>
          <button type="button" aria-current={page === 'account' ? 'page' : undefined} onClick={() => goTo('account')}><span className="mobile-nav-icon" aria-hidden="true">♙</span><span>Compte</span></button>
          <button type="button" aria-current={page === 'admin' ? 'page' : undefined} onClick={() => goTo('admin')}><span className="mobile-nav-icon" aria-hidden="true">▤</span><span>Admin</span></button>
        </nav>
      )}

      {notice && <p className="toast" role="status">{notice}</p>}
    </div>
  );
}
`;

  const indexCss = `:root {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #222a25;
  background: #f5f2ec;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  --bg: #f5f2ec;
  --ink: #222a25;
  --muted: #6d756f;
  --line: #deded5;
  --paper: #fffefa;
  --surface-2: #eeebe4;
  --brand: #2f5a4b;
  --brand-strong: #24483c;
  --brand-soft: #e2ebe5;
  --accent: #c47b55;
  --accent-dark: #24483c;
  --sage: #e2ebe5;
  --radius: 18px;
  --radius-sm: 12px;
}

* { box-sizing: border-box; }
html { min-width: 320px; scroll-behavior: smooth; }
body { margin: 0; min-width: 320px; background: var(--bg); color: var(--ink); }
button, input, select, textarea { font: inherit; }
button { color: inherit; }
button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 3px;
}
button:disabled { cursor: not-allowed; opacity: .58; }
a { color: inherit; }

.storefront { min-height: 100vh; }
.skip-link {
  position: absolute;
  top: -50px;
  left: 16px;
  z-index: 20;
  padding: 10px 14px;
  color: white;
  background: var(--ink);
}
.skip-link:focus { top: 12px; }
.site-header {
  position: relative;
  height: 82px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 0 clamp(20px, 6vw, 88px);
  border-bottom: 1px solid var(--line);
  background: var(--paper);
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  border: 0;
  background: none;
  font-size: 19px;
  font-weight: 750;
  letter-spacing: -.04em;
  cursor: pointer;
}
.brand-mark {
  display: inline-grid;
  width: 31px;
  height: 31px;
  place-items: center;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  font-size: 15px;
}
.main-nav { display: flex; align-items: center; gap: clamp(14px, 3vw, 38px); }
.mobile-menu-toggle { display: none; }
.main-menu-item { position: relative; }
.main-menu-item > a, .main-menu-item > span { display: inline-block; padding: 8px 0; color: #5e5b55; text-decoration: none; }
.main-menu-children {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 5;
  display: none;
  min-width: 190px;
  padding: 8px;
  border: 1px solid var(--line);
  background: var(--paper);
  box-shadow: 0 8px 22px #00000014;
}
.main-menu-item:hover .main-menu-children, .main-menu-item:focus-within .main-menu-children { display: grid; }
.main-menu-children button, .main-menu-children a { padding: 9px; text-align: left; text-decoration: none; }
.main-nav button, .site-footer button {
  border: 0;
  padding: 8px 0;
  background: none;
  color: #5e5b55;
  cursor: pointer;
}
.main-nav button[aria-current="page"] { color: var(--accent-dark); font-weight: 700; }
.cart-link {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 9px 14px;
  background: transparent;
  cursor: pointer;
}
.cart-count {
  display: inline-grid;
  min-width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 50%;
  background: var(--ink);
  color: white;
  font-size: 12px;
}

.hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 500px;
  padding: 46px clamp(24px, 8vw, 120px);
  background: #ede9df;
}
.hero-copy { align-self: center; max-width: 540px; padding: 22px 0; }
.eyebrow {
  margin: 0 0 14px;
  color: var(--accent-dark);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .16em;
}
h1, h2, h3, p { overflow-wrap: anywhere; }
.hero h1 {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(45px, 6vw, 76px);
  font-weight: 500;
  line-height: .99;
  letter-spacing: -.055em;
}
.hero-copy > p:not(.eyebrow) { max-width: 430px; margin: 24px 0; color: #64615b; line-height: 1.7; }
.button {
  min-height: 45px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 2px;
  padding: 11px 18px;
  font-weight: 650;
  cursor: pointer;
  transition: background .16s ease, color .16s ease, border-color .16s ease;
}
.button-dark { color: white; background: var(--ink); }
.button-dark:hover:not(:disabled) { background: #44413a; }
.button-outline { border-color: var(--ink); background: transparent; }
.button-outline:hover:not(:disabled) { color: white; background: var(--ink); }
.button-light { color: var(--ink); background: #fffefa; }
.button-light:hover { background: #eee8dc; }
.button-wide { width: 100%; }
.hero-art {
  position: relative;
  min-height: 395px;
  overflow: hidden;
  align-self: stretch;
  background: #d6c9b2;
}
.art-sun {
  position: absolute;
  top: 9%;
  right: 12%;
  width: min(23vw, 190px);
  aspect-ratio: 1;
  border-radius: 50%;
  background: #d68a5f;
}
.art-shape { position: absolute; display: block; }
.art-shape-one {
  width: 44%;
  height: 75%;
  right: 32%;
  bottom: -5%;
  border-radius: 48% 48% 4% 4%;
  background: #4b6256;
  transform: rotate(6deg);
}
.art-shape-two {
  width: 27%;
  height: 54%;
  right: 14%;
  bottom: -4%;
  border-radius: 50% 50% 0 0;
  background: #b07a57;
  transform: rotate(-8deg);
}
.art-caption {
  position: absolute;
  left: 7%;
  bottom: 8%;
  color: #fff7e8;
  font-family: Georgia, serif;
  font-size: 13px;
  line-height: 1.4;
  letter-spacing: .15em;
}
.benefits {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px clamp(28px, 7vw, 90px);
  padding: 20px;
  border-bottom: 1px solid var(--line);
  background: var(--paper);
}
.benefits p { margin: 0; color: #625f58; font-size: 13px; }
.benefits span { margin-right: 7px; color: var(--accent); }

.catalog-section { padding: 86px clamp(22px, 6vw, 92px) 100px; }
.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 36px;
}
.section-heading h2, .newsletter h2 {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(35px, 4vw, 50px);
  font-weight: 500;
  letter-spacing: -.045em;
}
.search-form { display: flex; gap: 8px; }
.search-form input, .form-card input {
  min-height: 45px;
  border: 1px solid #d8d5ce;
  border-radius: 2px;
  padding: 10px 12px;
  background: #fffefa;
}
.search-form input { width: min(280px, 36vw); }
.catalog-layout { display: grid; grid-template-columns: 190px minmax(0, 1fr); gap: 34px; }
.category-panel { display: flex; flex-direction: column; align-items: stretch; gap: 5px; }
.category-panel h3 { margin: 0 0 10px; font-size: 14px; }
.category-option {
  border: 0;
  border-radius: 2px;
  padding: 9px 10px;
  background: transparent;
  color: #706d66;
  text-align: left;
  cursor: pointer;
}
.category-option:hover, .category-option.active { background: #eee9df; color: var(--ink); }
.featured-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 25px; }
.featured-card {
  min-height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--line);
  padding: 13px 15px;
  background: var(--paper);
  font-family: Georgia, serif;
  text-align: left;
  cursor: pointer;
}
.featured-card:hover { border-color: var(--accent); }
.product-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 30px 20px; }
.product-card { min-width: 0; }
.product-image, .detail-image {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 4.7;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 0;
  background: #e7e2d7;
}
.product-image { cursor: pointer; }
.image-tone-1 { background: #dde4db; }
.image-tone-2 { background: #e7d9d0; }
.image-tone-3 { background: #d8dfe4; }
.product-image img, .detail-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .3s ease;
}
.product-image:hover img { transform: scale(1.035); }
.image-placeholder {
  color: rgba(36, 35, 31, .48);
  font-family: Georgia, serif;
  font-size: clamp(36px, 6vw, 70px);
}
.image-open {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 50%;
  background: var(--paper);
}
.product-info { display: flex; justify-content: space-between; gap: 12px; padding: 14px 0 10px; }
.product-sku { margin: 0 0 5px; color: var(--muted); font-size: 10px; letter-spacing: .12em; }
.product-title {
  border: 0;
  padding: 0;
  background: none;
  font-family: Georgia, serif;
  font-size: 18px;
  text-align: left;
  cursor: pointer;
}
.product-price { flex: 0 0 auto; margin: 3px 0 0; font-size: 14px; font-weight: 700; }
.add-button { width: 100%; min-height: 41px; font-size: 13px; }
.empty-state { padding: 28px 20px; color: var(--muted); text-align: center; }
.newsletter {
  padding: 75px 24px;
  background: #354a40;
  color: white;
  text-align: center;
}
.newsletter .eyebrow { color: #e5b79e; }
.newsletter h2 { font-size: clamp(36px, 4vw, 52px); }
.newsletter > p:not(.eyebrow) { margin: 15px 0 25px; color: #d3dbd4; }

.page-section { min-height: 55vh; padding: 58px clamp(22px, 7vw, 100px) 95px; }
.page-section > h1 {
  margin: 0 0 28px;
  font-family: Georgia, serif;
  font-size: clamp(38px, 5vw, 58px);
  font-weight: 500;
  letter-spacing: -.045em;
}
.narrow-section { max-width: 940px; margin: 0 auto; }
.back-link, .inline-link {
  border: 0;
  padding: 0;
  background: none;
  color: var(--accent-dark);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}
.back-link { margin: 0 0 30px; }
.product-detail { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, .8fr); gap: clamp(30px, 7vw, 90px); align-items: center; }
.detail-image { aspect-ratio: 1 / 1.05; }
.detail-copy h1 { margin: 0 0 15px; font-family: Georgia, serif; font-size: clamp(38px, 5vw, 58px); font-weight: 500; line-height: 1.05; }
.detail-copy > p:not(.eyebrow) { color: #65625b; line-height: 1.8; }
.detail-copy .detail-price { margin: 0 0 22px; color: var(--ink); font-size: 20px; font-weight: 700; }
.detail-categories, .stock-status { font-size: 13px; }
.detail-copy .button { margin-top: 20px; }
.cart-list { border-top: 1px solid var(--line); }
.cart-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 150px 120px;
  align-items: center;
  gap: 20px;
  border-bottom: 1px solid var(--line);
  padding: 20px 0;
}
.cart-product { display: grid; gap: 5px; }
.cart-product span, .muted { color: var(--muted); font-size: 13px; }
.quantity-control { display: inline-flex; align-items: center; justify-content: center; gap: 15px; }
.quantity-control button {
  width: 30px;
  height: 30px;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--paper);
  cursor: pointer;
}
.cart-row > strong { text-align: right; }
.cart-summary { max-width: 410px; margin: 25px 0 0 auto; }
.cart-summary > p:first-child, .checkout-total { display: flex; justify-content: space-between; gap: 20px; font-size: 17px; }
.cart-summary .muted { line-height: 1.6; }
.cart-summary .button { margin-top: 10px; }
.form-card { border: 1px solid var(--line); padding: clamp(20px, 4vw, 38px); background: var(--paper); }
.form-card form { display: grid; gap: 18px; }
.form-card label { display: grid; gap: 7px; font-size: 13px; font-weight: 650; }
.form-card input { width: 100%; }
.form-card fieldset { margin: 0; border: 0; padding: 0; }
.form-card legend { margin-bottom: 20px; font-family: Georgia, serif; font-size: 23px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 17px; }
.form-grid .full-field { grid-column: 1 / -1; }
.checkout-total { margin: 24px 0; padding-top: 18px; border-top: 1px solid var(--line); }
.form-tabs { display: flex; gap: 18px; margin-bottom: 24px; border-bottom: 1px solid var(--line); }
.form-tabs button { border: 0; border-bottom: 2px solid transparent; padding: 0 0 11px; background: none; cursor: pointer; }
.form-tabs button[aria-selected="true"] { border-color: var(--accent); color: var(--accent-dark); font-weight: 700; }
.account-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 28px; }
.order-list { border-top: 1px solid var(--line); }
.order-row { display: grid; gap: 14px; border-bottom: 1px solid var(--line); padding: 19px 0; }
.order-main { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 25px; }
.order-main > div { display: grid; gap: 5px; }
.order-main > div span { color: var(--muted); font-size: 12px; }
.return-form { display: flex; align-items: end; gap: 12px; }
.return-form label { display: grid; gap: 6px; flex: 1; color: var(--muted); font-size: 12px; }
.return-form input { width: 100%; }
.status-pill { border-radius: 99px; padding: 6px 10px; background: #e7eee5; font-size: 12px; text-transform: capitalize; }
.feedback { margin: 15px 0; border: 1px solid; padding: 13px 16px; font-size: 14px; line-height: 1.5; }
.feedback.error { border-color: #e4aaa0; background: #fff3f0; color: #843526; }
.feedback.info { border-color: #d7d2c4; background: #f3f0e8; color: #48443c; }
.feedback.success { border-color: #b4c9ad; background: #eff6ed; color: #345331; }
.admin-nav { display: flex; flex-wrap: wrap; gap: 8px; margin: 24px 0; }
.admin-nav button {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 9px 14px;
  background: var(--paper);
  cursor: pointer;
}
.admin-nav button[aria-selected="true"] { border-color: var(--ink); background: var(--ink); color: white; }
.admin-section { margin: 38px 0; }
.admin-section h2 { font-family: Georgia, serif; font-weight: 500; }
.admin-section h3 { font-family: Georgia, serif; font-weight: 500; }
.admin-product-form, .content-form { display: grid; gap: 12px; min-width: 220px; }
.admin-product-form label, .content-form label, .dashboard-range label { display: grid; gap: 6px; font-size: 12px; }
.admin-product-form input:not([type="checkbox"]), .content-form input, .content-form select, .content-form textarea, .dashboard-range input {
  width: 100%;
  min-height: 40px;
  border: 1px solid #d8d5ce;
  border-radius: 2px;
  padding: 8px 10px;
  background: var(--paper);
}
.content-form textarea { resize: vertical; line-height: 1.6; }
.content-form .checkbox-field { display: flex; align-items: center; gap: 8px; }
.content-form .checkbox-field input { width: auto; min-height: auto; }
.admin-actions { display: flex; flex-wrap: wrap; align-items: end; gap: 8px; }
.dashboard-range { display: flex; align-items: end; flex-wrap: wrap; gap: 12px; margin: 20px 0; }
.dashboard-range label { min-width: 180px; }
.dashboard-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 22px 0; }
.dashboard-metrics article { display: grid; gap: 9px; border: 1px solid var(--line); padding: 18px; background: var(--paper); }
.dashboard-metrics span { color: var(--muted); font-size: 12px; }
.dashboard-metrics strong { font-family: Georgia, serif; font-size: 24px; }
.dashboard-columns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
.content-admin-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 24px; }
.content-page-list { display: grid; gap: 10px; margin-top: 16px; }
.content-admin-row { display: grid; gap: 8px; border: 1px solid var(--line); padding: 14px; background: var(--paper); }
.content-admin-row > div:first-child { display: grid; gap: 5px; }
.content-page { max-width: 760px; margin: 0 auto; }
.content-page h1 { font-family: Georgia, serif; font-weight: 500; }
.content-body { white-space: pre-wrap; line-height: 1.85; color: #55524c; }
.table-scroll { overflow-x: auto; border: 1px solid var(--line); background: var(--paper); }
table { width: 100%; border-collapse: collapse; text-align: left; }
th, td { padding: 13px 15px; border-bottom: 1px solid var(--line); }
th { background: #f1eee8; font-size: 12px; }
td { font-size: 14px; }
.site-footer {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 18px 35px;
  padding: 36px clamp(22px, 6vw, 90px);
  border-top: 1px solid var(--line);
  background: var(--paper);
}
.site-footer > p { margin: 0; color: var(--muted); font-size: 13px; }
.site-footer > div { display: flex; flex-wrap: wrap; gap: 12px 20px; }
.footer-links a { color: var(--accent-dark); }
.site-footer small { grid-column: 1 / -1; color: var(--muted); font-size: 11px; }
.footer-brand { font-size: 16px; }
.toast {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 10;
  max-width: min(440px, calc(100vw - 40px));
  margin: 0;
  border: 1px solid #b4c9ad;
  padding: 13px 17px;
  background: #eff6ed;
  box-shadow: 0 8px 30px #00000014;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

@media (max-width: 850px) {
  .site-header { height: 72px; padding: 0 20px; }
  .main-nav { gap: 15px; }
  .dashboard-columns, .content-admin-grid { grid-template-columns: 1fr; }
  .admin-nav { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 5px; }
  .hero { min-height: 410px; padding: 35px 36px; }
  .hero-art { min-height: 320px; }
  .catalog-layout { grid-template-columns: 155px minmax(0, 1fr); gap: 20px; }
  .product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .featured-strip { grid-template-columns: 1fr; }
}
@media (max-width: 620px) {
  .site-header { height: auto; min-height: 72px; flex-wrap: wrap; gap: 10px; padding: 12px 16px; }
  .brand { font-size: 15px; }
  .brand-mark { width: 27px; height: 27px; }
  .mobile-menu-toggle {
    display: inline-grid;
    width: 40px;
    height: 40px;
    place-items: center;
    border: 1px solid var(--line);
    border-radius: 50%;
    background: var(--paper);
    cursor: pointer;
  }
  .main-nav { display: none; order: 4; width: 100%; align-items: stretch; flex-direction: column; gap: 4px; padding: 10px 0 2px; border-top: 1px solid var(--line); }
  .main-nav.is-open { display: flex; }
  .main-nav > button, .main-menu-item > button, .main-menu-item > a, .main-menu-item > span { width: 100%; padding: 11px 8px; text-align: left; }
  .main-menu-children { position: static; display: grid; min-width: 0; margin-left: 12px; border: 0; border-left: 1px solid var(--line); box-shadow: none; }
  .cart-link { margin-left: auto; }
  .main-nav button { font-size: 13px; }
  .cart-link { gap: 5px; padding: 7px 9px; font-size: 12px; }
  .cart-count { min-width: 19px; height: 19px; }
  .hero { grid-template-columns: 1fr; padding: 32px 22px; }
  .hero-copy { padding: 8px 0 22px; }
  .hero-art { min-height: 260px; }
  .art-sun { width: 120px; }
  .benefits { justify-content: flex-start; gap: 11px 22px; padding: 17px 22px; }
  .benefits p { font-size: 12px; }
  .catalog-section { padding: 58px 20px 70px; }
  .section-heading { align-items: stretch; flex-direction: column; margin-bottom: 25px; }
  .search-form input { width: 100%; min-width: 0; }
  .search-form .button { padding: 9px 12px; }
  .catalog-layout { grid-template-columns: 1fr; }
  .category-panel { display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; }
  .category-panel h3 { flex-basis: 100%; }
  .category-option { border: 1px solid var(--line); padding: 7px 10px; font-size: 12px; }
  .product-grid { gap: 23px 12px; }
  .product-info { display: block; }
  .product-price { margin-top: 8px; }
  .product-title { font-size: 16px; }
  .add-button { padding: 8px; font-size: 11px; }
  .page-section { padding: 42px 20px 70px; }
  .product-detail { grid-template-columns: 1fr; }
  .detail-image { max-height: 480px; }
  .cart-row { grid-template-columns: minmax(0, 1fr) auto; gap: 10px; }
  .cart-row > strong { grid-column: 2; grid-row: 1; }
  .quantity-control { grid-column: 1; justify-content: flex-start; }
  .cart-row > strong { grid-row: 2; }
  .form-grid { grid-template-columns: 1fr; }
  .form-grid .full-field { grid-column: auto; }
  .order-main { grid-template-columns: 1fr auto; gap: 10px; }
  .order-main > strong { grid-column: 1; }
  .return-form { align-items: stretch; flex-direction: column; }
  .status-pill { grid-column: 2; grid-row: 1 / span 2; }
  .site-footer { grid-template-columns: 1fr; gap: 12px; }
  .site-footer small { grid-column: auto; }
  .dashboard-range { align-items: stretch; flex-direction: column; }
  .dashboard-range label { min-width: 0; }
  .dashboard-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    transition-duration: .01ms !important;
    animation-duration: .01ms !important;
  }
}

body.theme-dark {
  color-scheme: dark;
  --bg: #151b18;
  --paper: #202923;
  --surface-2: #29332c;
  --ink: #edf0e9;
  --muted: #a9b2aa;
  --line: #39453d;
  --brand: #9ab9a6;
  --brand-strong: #b8d1c0;
  --brand-soft: #2c4034;
  --accent: #d69a76;
  --accent-dark: #b8d1c0;
  --sage: #2c4034;
}

.storefront { background: var(--bg); color: var(--ink); }
.site-header {
  position: sticky;
  top: 0;
  z-index: 52;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  width: 100%;
  height: auto;
  min-height: 82px;
  padding: 10px max(20px, calc((100vw - 1220px) / 2));
  background: color-mix(in srgb, var(--bg) 94%, transparent);
  box-shadow: 0 5px 22px rgba(26, 36, 29, .045);
  backdrop-filter: blur(14px);
}
.brand {
  grid-column: 1;
  grid-row: 1;
  min-width: max-content;
  font-weight: 500;
  letter-spacing: 0;
  text-align: left;
}
.brand-mark {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: 11px 11px 11px 3px;
  background: var(--brand);
  color: #fff;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 19px;
}
.brand-copy { display: block; }
.brand-name {
  display: block;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 19px;
  line-height: 1;
}
.brand-sub {
  display: block;
  margin-top: 5px;
  color: var(--muted);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: .18em;
  text-transform: uppercase;
}
.main-nav {
  grid-column: 2;
  grid-row: 1;
  justify-content: center;
  gap: 3px;
  min-width: 0;
  padding: 5px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper);
}
.main-nav > button, .main-menu-item > button, .main-menu-item > a, .main-menu-item > span {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 8px 13px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}
.main-nav > button:hover, .main-menu-item > button:hover, .main-menu-item > a:hover {
  background: var(--surface-2);
  color: var(--ink);
}
.main-nav > button[aria-current="page"] { background: var(--brand-soft); color: var(--brand-strong); }
.main-menu-item > button[aria-current="page"] { background: var(--brand-soft); color: var(--brand-strong); }
.main-menu-item > button { cursor: pointer; }
.main-menu-children {
  z-index: 45;
  border-color: var(--line);
  border-radius: var(--radius-sm, 12px);
  background: var(--paper);
}
.header-actions { grid-column: 3; grid-row: 1; display: flex; align-items: center; gap: 8px; }
.icon-button, .mobile-menu-toggle {
  min-width: 40px;
  min-height: 40px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper);
  color: var(--ink);
}
.theme-toggle { display: inline-flex; align-items: center; justify-content: center; font-size: 16px; }
.cart-link {
  min-height: 42px;
  border: 0;
  border-radius: 999px;
  padding: 10px 16px;
  background: var(--brand);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 5px 14px color-mix(in srgb, var(--brand) 16%, transparent);
}
.cart-link:hover { background: var(--brand-strong); color: #fff; }
.cart-count { background: rgba(255,255,255,.2); }
.mobile-menu-toggle, .mobile-menu-head, .mobile-menu-backdrop, .mobile-bottom-nav { display: none; }
.top-note { background: var(--brand); color: #fff; text-align: center; padding: 7px 16px; font-size: 11px; letter-spacing: .07em; }
.top-note strong { color: inherit; }
.hero {
  width: min(1220px, calc(100% - 40px));
  min-height: 490px;
  margin: 28px auto 0;
  overflow: hidden;
  border-radius: 28px;
  box-shadow: 0 18px 50px rgba(40, 43, 36, .08);
}
.hero-copy .eyebrow { color: #597263; }
.hero-copy > p:not(.eyebrow) { color: #526258; }
.hero-art { border-radius: 0 28px 28px 0; }
.button, .button-dark {
  border-radius: 999px;
  background: var(--brand);
  color: #fff;
  transition: transform .15s, background .15s, border-color .15s;
}
.button:hover:not(:disabled), .button-dark:hover:not(:disabled) { transform: translateY(-1px); background: var(--brand-strong); color: #fff; }
.button-outline, .button-light { border-radius: 999px; }
.product-image, .detail-image { border-radius: 15px; }
.featured-card, .form-card, .dashboard-metrics article, .content-admin-row, .table-scroll {
  border-radius: var(--radius, 18px);
}
.form-card input, .search-form input, .admin-product-form input:not([type="checkbox"]),
.content-form input, .content-form select, .content-form textarea, .dashboard-range input {
  border-color: var(--line);
  border-radius: 10px;
  background: var(--paper);
  color: var(--ink);
}
.category-option { border-radius: 999px; }
.category-option:hover, .category-option.active { background: var(--brand-soft); color: var(--brand-strong); }
.page-section { width: min(1220px, 100%); margin-inline: auto; }
.admin-page-section { width: 100%; max-width: none; padding: 38px max(20px, calc((100vw - 1220px) / 2)) 70px; }
.admin-workspace { display: grid; grid-template-columns: 230px minmax(0, 1fr); align-items: start; gap: 24px; }
.admin-sidebar {
  position: sticky;
  top: 104px;
  display: grid;
  gap: 5px;
  padding: 16px 12px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--paper);
}
.admin-sidebar-label { padding: 5px 10px 10px; color: var(--muted); font-size: 10px; font-weight: 800; letter-spacing: .13em; }
.admin-sidebar button {
  width: 100%;
  min-height: 40px;
  padding: 9px 11px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}
.admin-sidebar button:hover, .admin-sidebar button.active { background: var(--brand-soft); color: var(--brand-strong); }
.admin-sidebar .admin-sidebar-store { margin-top: 12px; border-top: 1px solid var(--line); border-radius: 0; color: var(--brand-strong); }
.admin-main-content { min-width: 0; }
.admin-main-content .admin-section { margin: 0 0 30px; }
.admin-main-content .admin-section > h2 { margin-bottom: 20px; }
.admin-footer { padding: 18px max(20px, calc((100vw - 1220px) / 2)); background: var(--paper); }
.admin-footer-inner { display: flex; justify-content: space-between; gap: 12px 24px; color: var(--muted); font-size: 11px; }
.site-footer {
  display: block;
  padding: 48px 0 27px;
  border-top: 1px solid var(--line);
  background: var(--paper);
}
.site-footer > .footer-wrap { display: block; }
.footer-wrap { width: min(1220px, calc(100% - 40px)); margin-inline: auto; }
.footer-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) repeat(3, minmax(140px, .72fr)); align-items: start; gap: clamp(20px, 4vw, 52px); }
.footer-brand-block { min-width: 0; max-width: 420px; }
.footer-brand-block > p { max-width: 330px; margin: 17px 0 11px; font-size: 13px; line-height: 1.75; }
.footer-signature { color: var(--brand-strong); font-family: Georgia, "Times New Roman", serif; font-size: 13px; font-style: italic; }
.footer-column { min-width: 0; }
.footer-heading { margin: 4px 0 16px; color: var(--ink); font-family: inherit; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.footer-links { display: grid; justify-items: start; gap: 11px; color: var(--muted); font-size: 13px; }
.footer-links button, .footer-links a { max-width: 100%; padding: 0; border: 0; background: none; color: var(--muted); font-size: inherit; line-height: 1.45; text-align: left; text-decoration: none; overflow-wrap: anywhere; cursor: pointer; }
.footer-links button:hover, .footer-links a:hover { color: var(--brand-strong); }
.footer-team-access { margin-top: 8px; padding-top: 10px !important; border-top: 1px solid var(--line) !important; }
.footer-bottom { display: flex; align-items: center; justify-content: space-between; gap: 14px 24px; margin-top: 35px; padding-top: 18px; border-top: 1px solid var(--line); color: var(--muted); font-size: 11px; }
.footer-bottom span:last-child { text-align: right; }
.admin-footer-inner span:last-child { text-align: right; }
.toast { z-index: 70; border-radius: 12px; }
body.theme-dark .hero { background: #29332c; color: var(--ink); }
body.theme-dark .hero-copy .eyebrow, body.theme-dark .hero-copy > p:not(.eyebrow),
body.theme-dark .detail-copy > p:not(.eyebrow), body.theme-dark .content-body { color: var(--muted); }
body.theme-dark .hero-art { background: linear-gradient(140deg, #394a3d, #293a30 58%, #1d2b24); }
body.theme-dark .benefits, body.theme-dark .newsletter { background: var(--surface-2); color: var(--ink); }
body.theme-dark .benefits p, body.theme-dark .newsletter > p:not(.eyebrow) { color: var(--muted); }
body.theme-dark .newsletter .eyebrow { color: var(--accent); }
body.theme-dark .feedback.error { border-color: #744541; background: #482d2c; color: #edaaa5; }
body.theme-dark .feedback.info { border-color: var(--line); background: var(--surface-2); color: var(--ink); }
body.theme-dark .feedback.success { border-color: #46654f; background: #2b4435; color: #b8d1c0; }
body.theme-dark .status-pill { background: var(--brand-soft); color: var(--ink); }
body.theme-dark th { background: var(--surface-2); }
body.theme-dark .toast { border-color: #46654f; background: #2b4435; color: var(--ink); }

@media (max-width: 1050px) {
  .site-header { grid-template-columns: minmax(0, 1fr) auto; min-height: 70px; gap: 12px; padding: 8px 20px; }
  .brand { grid-column: 1; grid-row: 1; }
  .header-actions { grid-column: 2; grid-row: 1; }
  .mobile-menu-toggle { display: inline-grid; place-items: center; }
  .cart-link { min-height: 40px; padding: 8px 12px; }
  .main-nav { display: none; }
  .main-nav.is-open {
    position: fixed;
    inset: 0 0 0 auto;
    z-index: 52;
    display: flex;
    width: min(360px, 88vw);
    height: 100dvh;
    align-items: stretch;
    justify-content: flex-start;
    flex-direction: column;
    gap: 4px;
    overflow-y: auto;
    padding: 22px;
    border: 0;
    border-radius: 0;
    background: var(--paper);
    box-shadow: -16px 0 48px rgba(0, 0, 0, .16);
  }
  .main-nav.is-open > button, .main-nav.is-open .main-menu-item > button,
  .main-nav.is-open .main-menu-item > a, .main-nav.is-open .main-menu-item > span { width: 100%; justify-content: flex-start; }
  .main-nav.is-open .main-menu-children { position: static; display: grid; min-width: 0; margin-left: 12px; border: 0; border-left: 1px solid var(--line); border-radius: 0; box-shadow: none; }
  .mobile-menu-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid var(--line); }
  .mobile-menu-head strong { font-family: Georgia, "Times New Roman", serif; font-size: 20px; }
  .mobile-menu-backdrop { position: fixed; inset: 0; z-index: 50; display: block; border: 0; background: rgba(17, 24, 19, .45); }
  .mobile-bottom-nav { position: fixed; inset: auto 0 0; z-index: 45; display: flex; align-items: stretch; gap: 3px; overflow-x: auto; padding: 7px 8px calc(7px + env(safe-area-inset-bottom)); border-top: 1px solid var(--line); background: color-mix(in srgb, var(--paper) 96%, transparent); backdrop-filter: blur(14px); }
  .mobile-bottom-nav button { display: grid; flex: 1 0 68px; min-width: 62px; justify-items: center; align-content: center; gap: 2px; min-height: 48px; padding: 3px 6px; border: 0; border-radius: 10px; background: transparent; color: var(--muted); font-size: 10px; font-weight: 600; white-space: nowrap; cursor: pointer; }
  .mobile-bottom-nav button[aria-current="page"] { background: var(--brand-soft); color: var(--brand-strong); }
  .mobile-nav-icon { font-size: 17px; line-height: 1.1; }
  .storefront { padding-bottom: calc(64px + env(safe-area-inset-bottom)); }
  .site-footer:not(.admin-footer) { padding-bottom: calc(92px + env(safe-area-inset-bottom)); }
  .footer-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 26px 22px; }
  .footer-brand-block { grid-column: 1 / -1; max-width: none; padding-bottom: 20px; border-bottom: 1px solid var(--line); }
  .footer-brand-block > p { max-width: 520px; }
  .footer-legal-column { grid-column: 1 / -1; padding-top: 18px; border-top: 1px solid var(--line); }
  .footer-bottom { margin-top: 26px; }
  .admin-workspace { grid-template-columns: minmax(0, 1fr); }
  .admin-sidebar { display: none; }
  .admin-page-section { padding-bottom: 38px; }
  .admin-footer { padding-bottom: calc(80px + env(safe-area-inset-bottom)); }
  .admin-footer-inner { align-items: flex-start; flex-direction: column; gap: 4px; }
  .admin-footer-inner span:last-child { text-align: left; }
}
@media (max-width: 620px) {
  .site-header { min-height: 66px; padding-inline: 14px; }
  .brand { gap: 8px; }
  .brand-mark { width: 30px; height: 30px; flex-basis: 30px; font-size: 17px; }
  .brand-name { font-size: 16px; }
  .brand-sub { font-size: 8px; letter-spacing: .12em; }
  .header-actions { gap: 5px; }
  .header-actions .icon-button, .mobile-menu-toggle { min-width: 36px; min-height: 36px; }
  .cart-link { min-height: 36px; gap: 5px; padding: 7px 9px; font-size: 11px; }
  .cart-count { min-width: 19px; height: 19px; }
  .hero { width: calc(100% - 24px); min-height: 0; margin-top: 12px; grid-template-columns: 1fr; border-radius: 22px; }
  .hero-copy { padding: 32px 22px 24px; }
  .hero-art { min-height: 260px; border-radius: 0 0 22px 22px; }
  .page-section, .admin-page-section { padding: 36px 16px 48px; }
  .footer-wrap { width: calc(100% - 32px); }
  .footer-grid { gap: 22px 15px; }
  .footer-heading { margin-bottom: 12px; }
  .footer-links { gap: 10px; font-size: 12px; }
  .footer-bottom { align-items: flex-start; flex-direction: column; gap: 5px; font-size: 10px; }
  .footer-bottom span:last-child { text-align: left; }
  .admin-footer { padding-inline: 16px; }
  .admin-page-section > h1 { font-size: clamp(34px, 10vw, 48px); }
}
`;

  return [
    makeFile(
      'frontend/public/images/demo-product.svg',
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" role="img" aria-labelledby="title">
  <title id="title">Produit de démonstration</title>
  <rect width="640" height="480" fill="#eeebe4"/>
  <circle cx="320" cy="210" r="115" fill="#c47b55" opacity=".9"/>
  <path d="M250 210h140M320 140v140" stroke="#fffefa" stroke-width="14" stroke-linecap="round"/>
  <text x="320" y="390" text-anchor="middle" fill="#222a25" font-family="sans-serif" font-size="24">Votre catalogue commence ici</text>
</svg>`,
      'html',
      'Illustration locale déterministe du produit exemple seedé dans la migration PostgreSQL.'
    ),
    makeFile(
      'frontend/package.json',
      packageJson,
      'json',
      'Manifeste npm du storefront React et de son outillage Vite.',
      'ADR-002'
    ),
    makeFile(
      'frontend/index.html',
      indexHtml,
      'html',
      'Document HTML français qui monte l’application e-commerce Vite.',
      'ADR-002'
    ),
    makeFile(
      'frontend/vite.config.ts',
      viteConfig,
      'typescript',
      'Configuration Vite avec proxy de développement vers les routes backend /api.',
      'ADR-002'
    ),
    makeFile(
      'frontend/tsconfig.json',
      tsconfigJson,
      'json',
      'Configuration TypeScript racine avec références de projet.'
    ),
    makeFile(
      'frontend/tsconfig.app.json',
      tsconfigAppJson,
      'json',
      'Configuration stricte TypeScript pour les sources React.'
    ),
    makeFile(
      'frontend/tsconfig.node.json',
      tsconfigNodeJson,
      'json',
      'Configuration TypeScript des scripts Vite.'
    ),
    makeFile(
      'frontend/src/main.tsx',
      mainTsx,
      'typescript',
      'Point d’entrée React qui monte le storefront.'
    ),
    makeFile(
      'frontend/src/App.tsx',
      appTsx,
      'typescript',
      'Storefront français : catalogue, recherche, panier, commande, compte et vues admin.',
      'ADR-002'
    ),
    makeFile(
      'frontend/src/index.css',
      indexCss,
      'css',
      'Styles responsives accessibles pour les pages de la boutique.'
    ),
  ];
}
