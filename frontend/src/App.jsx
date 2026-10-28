import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "./api";
import ProductReview from "./ProductReview";
import PaymentStatusPage from "./PaymentStatus";
import AdminPage from "./AdminPage";


const demoProducts = [
  { _id:"demo-shirt", name:"Everyday Cotton Shirt", category:"Men's Wear", description:"A breathable cotton shirt designed for everyday comfort.", price:799, currency:"INR", sizes:["XS","S","M","L","XL","XXL","XXXL"], stock:30, sellerName:"North Street Apparel", averageRating:4.5, reviewCount:124, images:["https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=900","https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=900","https://images.unsplash.com/photo-1620012253295-c15a3e9c6f14?w=900"] },
  { _id:"demo-shoes", name:"Classic White Sneakers", category:"Shoes", description:"Minimal everyday sneakers with a cushioned sole.", price:1499, currency:"INR", sizes:["6","7","8","9","10","11"], stock:22, sellerName:"Stride Studio", averageRating:4.4, reviewCount:89, images:["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900","https://images.unsplash.com/photo-1549298916-b41d501d3772?w=900","https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?w=900"] },
  { _id:"demo-tote", name:"Everyday Tote Bag", category:"Accessories", description:"A versatile carry-all tote for work, study, and weekends.", price:599, currency:"INR", sizes:[], stock:40, sellerName:"Carry Collective", averageRating:4.7, reviewCount:56, images:["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=900","https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900","https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=900"] },
  { _id:"demo-kids", name:"Kids Casual Hoodie", category:"Kids' Wear", description:"A soft, easy-to-layer hoodie for everyday adventures.", price:899, currency:"INR", sizes:["XS","S","M","L","XL"], stock:18, sellerName:"Little Day", averageRating:4.6, reviewCount:38, images:["https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=900","https://images.unsplash.com/photo-1503919005314-30d93d07d823?w=900","https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=900"] },
  { _id:"demo-bottle", name:"Training Sports Bottle", category:"Sports", description:"Reusable bottle for gym sessions, travel, and daily hydration.", price:349, currency:"INR", sizes:[], stock:65, sellerName:"Active Goods", averageRating:4.3, reviewCount:71, images:["https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=900","https://images.unsplash.com/photo-1523362628745-0c100150b504?w=900","https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900"] },
  { _id:"demo-jacket", name:"Women's Everyday Jacket", category:"Women's Wear", description:"A clean, versatile layer for changing weather.", price:1899, currency:"INR", sizes:["XS","S","M","L","XL","XXL"], stock:15, sellerName:"North Street Apparel", averageRating:4.5, reviewCount:93, images:["https://images.unsplash.com/photo-1548624149-f0a7f1e6f3f4?w=900","https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=900","https://images.unsplash.com/photo-1551028719-00167b16eac5?w=900"] }
];
const categories = ["All", "Men's Wear", "Women's Wear", "Kids' Wear", "Shoes", "Sports", "Accessories", "Electronics", "Food"];
const money = n => new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:0 }).format(n || 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) : "Not delivered yet";


function ScrollToTop() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }, [pathname]); return null; }

function App() {
  const [customer, setCustomer] = useState(null);
  const [products, setProducts] = useState(demoProducts);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("shopsphere-guest-cart") || "[]"));
  const [toast, setToast] = useState("");
  const [backendReady, setBackendReady] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const refreshProducts = useCallback(async (search="", category="All") => {
    try {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      if (category !== "All") q.set("category", category);
      const data = await api(`/products?${q.toString()}`);
      setProducts(data.products);    
      setBackendReady(true);
    } catch {
      setBackendReady(false);
      const lower = search.toLowerCase();
      setProducts(demoProducts.filter(p =>
        (!lower || p.name.toLowerCase().includes(lower)) &&
        (category === "All" || p.category === category)
      ));
    }
  }, []);

  const loadMe = useCallback(async () => {
    try {
      const data = await api("/auth/me");
      setCustomer(data.customer);
      if (data.customer) {
        try {
          const c = await api("/cart");
          setCart(c.cart.items.map(i => ({
            cartItemId: i._id, product: i.productId, productId: i.productId._id,
            quantity: i.quantity, selectedSize: i.selectedSize || ""
          })));
        } catch {}
      }
    } catch {}
  }, []);

  useEffect(() => { loadMe(); refreshProducts(); }, [loadMe, refreshProducts]);
  useEffect(() => { localStorage.setItem("shopsphere-guest-cart", JSON.stringify(customer ? [] : cart)); }, [cart, customer]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const addToCart = async (product, size="", qty=1) => {
    if (customer && !product._id.startsWith("demo-")) {
      try {
        const data = await api("/cart/items", { method:"POST", body:JSON.stringify({ productId:product._id, quantity:qty, selectedSize:size }) });
        setCart(data.cart.items.map(i => ({ cartItemId:i._id, product:i.productId, productId:i.productId._id, quantity:i.quantity, selectedSize:i.selectedSize || "" })));
        setToast("Added to your cart");
        return;
      } catch (e) { setToast(e.message); return; }
    }
    setCart(prev => {
      const found = prev.find(i => i.productId === product._id && i.selectedSize === size);
      if (found) return prev.map(i => i === found ? { ...i, quantity:i.quantity+qty } : i);
      return [...prev, { product, productId:product._id, quantity:qty, selectedSize:size }];
    });
    setToast("Added to your cart");
  };

  const changeQuantity = async (item, quantity) => {
    if (quantity < 1) return removeItem(item);
    if (customer && item.cartItemId) {
      try {
        const data = await api(`/cart/items/${item.cartItemId}`, { method:"PATCH", body:JSON.stringify({ quantity }) });
        setCart(data.cart.items.map(i => ({ cartItemId:i._id, product:i.productId, productId:i.productId._id, quantity:i.quantity, selectedSize:i.selectedSize || "" })));
      } catch(e) { setToast(e.message); }
    } else setCart(prev => prev.map(i => i === item ? { ...i, quantity } : i));
  };

  const removeItem = async item => {
    if (customer && item.cartItemId) {
      try {
        const data = await api(`/cart/items/${item.cartItemId}`, { method:"DELETE" });
        setCart((data.cart.items || []).map(i => ({ cartItemId:i._id, product:i.productId, productId:i.productId._id, quantity:i.quantity, selectedSize:i.selectedSize || "" })));
      } catch(e) { setToast(e.message); }
    } else setCart(prev => prev.filter(i => i !== item));
  };

  const signOut = async () => {
    try { await api("/auth/logout", { method:"POST", body:"{}" }); } catch {}
    setCustomer(null); setCart([]); localStorage.removeItem("shopsphere-guest-cart");
    setToast("You have signed out"); navigate("/");
  };

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  return <>
  <ScrollToTop />
    <header className="topbar">  
      <Link className="brand" to="/"><img src="/logo.png" alt="ShopSphere" className="brand-logo" height="60" width="60" /></Link>
    
      <div className="header-search"><SearchBox onSearch={q => { navigate("/"); refreshProducts(q); }} /></div>
      <nav className="nav-actions">
        <Link className="cart-link" to="/sell">Sell</Link>
        {customer?.isAdmin && <Link className="cart-link" to="/admin">Admin</Link>}
        <Link className="cart-link" to="/cart">Cart <span className="cart-count">{cartCount}</span></Link>
        {customer ? <Link className="profile-chip" to="/profile"><span className="avatar">{customer.name?.[0]?.toUpperCase() || "U"}</span><span>{customer.name}</span></Link> : <Link className="button button-dark small" to="/login" state={{ from: location.pathname }}>Login</Link>}
      </nav>
    </header>
    <div className="category-strip">{categories.map(c => <button key={c} onClick={() => { navigate("/"); refreshProducts("", c); }}>{c}</button>)}</div>
    {!backendReady && <div className="dev-banner">Preview mode: start the backend and seed MongoDB to enable accounts, saved carts and orders.</div>}
    <Routes>
      <Route path="/" element={<Home products={products} onSearch={refreshProducts} onAdd={addToCart} />} />
      <Route path="/product/:id" element={<ProductPage products={products} onAdd={addToCart} customer={customer} />} />
      <Route path="/login" element={<AuthPage mode="login" setCustomer={setCustomer} onDone={loadMe} />} />
      <Route path="/register" element={<AuthPage mode="register" setCustomer={setCustomer} onDone={loadMe} />} />
      <Route path="/cart" element={<CartPage cart={cart} changeQuantity={changeQuantity} removeItem={removeItem} customer={customer} navigate={navigate} setToast={setToast} />} />
      <Route path="/checkout" element={<CheckoutPage cart={cart} customer={customer} setCart={setCart} setToast={setToast} navigate={navigate} onOrderPlaced={() => refreshProducts()} />} />
      <Route path="/payment-status" element={<PaymentStatusPage setCart={setCart} onPaid={() => refreshProducts()} />} />
      <Route path="/admin" element={<AdminPage customer={customer} />} />
      <Route path="/sell" element={<SellPage customer={customer} setToast={setToast} refreshProducts={refreshProducts} />} />
      <Route path="/profile" element={<ProfilePage customer={customer} setCustomer={setCustomer} signOut={signOut} />} />
      <Route path="/orders" element={<OrdersPage customer={customer} />} />
      <Route path="/order/:id" element={<OrderPage customer={customer} />} />
      <Route path="/about" element={<About />} />
      <Route path="/terms" element={<Tems />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="*" element={<main className="page"><h2>Page not found</h2><Link to="/">Back to home</Link></main>} />
    </Routes>
    <footer><div className="footer-brand">shopsphere</div><p>Good finds for everyday life.</p><div className="footer-links"><Link to="/about">About</Link><a href="mailto:mahidharshans007@gmail.com">Contact</a><span>Shipping & returns</span><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link></div><small>© {new Date().getFullYear()} ShopSphere. Demo storefront.</small></footer>
    {toast && <div className="toast" role="status">{toast}</div>}
  </>;
}

function SearchBox({ onSearch }) {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const hasTyped = useRef(false);   // stays false until the user types something
  useEffect(() => {
    const timer = setTimeout(async () => {
      // Only reset the search if the user had typed and then cleared the box.
      // Doing it on the very first load sent every refresh / direct link (/sell, /cart ...) back to Home.
      if (!value.trim()) { setSuggestions([]); if (hasTyped.current) onSearch(""); return; }
      hasTyped.current = true;
      try {
        const data = await api(`/products?search=${encodeURIComponent(value)}`);
        setSuggestions(data.products.slice(0, 5));
      } catch {
        setSuggestions(demoProducts.filter(p => p.name.toLowerCase().includes(value.toLowerCase())).slice(0, 5));
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [value]);
  return <div className="search-wrap">
    <span className="search-icon">⌕</span>
    <input value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => e.key === "Enter" && (onSearch(value), setSuggestions([]))} placeholder="Search for anything..." aria-label="Search products" />
    {suggestions.length > 0 && <div className="suggestions">{suggestions.map(p => <Link key={p._id} to={`/product/${p._id}`} onClick={() => setSuggestions([])}><img src={p.images?.[0]} alt="" /><span>{p.name}</span><b>{money(p.price)}</b></Link>)}</div>}
  </div>;
}

function Home({ products, onSearch, onAdd }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const filtered = products.filter(p => activeCategory === "All" || p.category === activeCategory);
  return <main>
    <section className="hero">
      <div className="hero-copy"><div className="eyebrow"><span></span> THE EVERYDAY EDIT</div><h1>Good things.<br/><em>Great finds.</em></h1><p>Discover the pieces that make your everyday a little more special — all in one place.</p><a className="button button-dark" href="#products">Explore the collection <span>↗</span></a><div className="hero-note"><div className="mini-avatars"><i>J</i><i>A</i><i>M</i></div><span>Loved by everyday explorers</span></div></div>
      <div className="hero-art"><div className="hero-sticker">YOUR NEXT<br/>FAVOURITE<br/><b>IS HERE ✳</b></div><img className="hero-img" src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200" alt="A curated modern retail store" /><div className="hero-caption"><span>01 / NEW SEASON</span><b>Find your kind of good.</b></div></div>
    </section>
    <section className="trust-row"><div><b>✳ Thoughtfully picked</b><span>Everyday essentials, elevated</span></div><div><b>↗ Easy shopping</b><span>Simple from browse to buy</span></div><div><b>♡ Made for you</b><span>Find your next favourite</span></div></section>
    <section className="section" id="products">
      <div className="section-heading"><div><div className="eyebrow">A LITTLE BIT OF EVERYTHING</div><h2>Find your <em>favourite.</em></h2></div><p>Good design, useful things, and pieces<br/>you’ll keep reaching for.</p></div>
      <div className="filter-pills">{categories.map(c => <button className={activeCategory===c?"active":""} key={c} onClick={() => { setActiveCategory(c); onSearch("", c); }}>{c}</button>)}</div>
      {filtered.length ? <div className="product-grid">{filtered.map(p => <ProductCard key={p._id} product={p} onAdd={onAdd} />)}</div> : <div className="empty-state"><h3>No products found</h3><p>Try another category or search term.</p><button className="button button-outline" onClick={() => {setActiveCategory("All");onSearch("");}}>Show all products</button></div>}
    </section>
    <section className="promo"><div><div className="eyebrow">YOUR EVERYDAY, REIMAGINED</div><h2>Little things.<br/><em>Big difference.</em></h2><p>From wardrobe staples to useful finds, make room for the things you love.</p><a className="button button-light" href="#products">Shop the edit ↗</a></div><img src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1000" alt="Clothing and accessories" /></section>
    <section className="about-teaser"><span className="eyebrow">A NOTE FROM US</span><p>Shopping should feel simple, inspiring, and a little fun. That’s why we bring everyday finds together in one thoughtful place.</p><Link to="/about">A little more about us ↗</Link></section>
  </main>;
}

function ProductCard({ product, onAdd }) {
  return <article className="product-card">
    <Link to={`/product/${product._id}`} className="product-image"><img src={product.images?.[0]} alt={product.name} />{product.stock <= 0 ? <span className="stock-badge out">Out of stock</span> : product.stock <= 5 ? <span className="stock-badge low">Only {product.stock} left</span> : null}<span className="image-count">{Math.min(product.images?.length || 3,8)} photos</span></Link>
    <div className="product-card-info"><div className="product-meta"><span>{product.category}</span><span>★ {Number(product.averageRating || 0).toFixed(1)}</span></div><Link to={`/product/${product._id}`} className="product-name">{product.name}</Link><p className="product-description">{product.description}</p><div className="product-card-bottom"><b>{money(product.price)}</b><button aria-label={`Add ${product.name} to cart`} disabled={product.stock <= 0} onClick={() => product.sizes?.length ? alert("Open the product page to choose a size, then add it to your cart.") : onAdd(product)}>＋</button></div></div>
  </article>;
}

function ProductPage({ products, onAdd, customer }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(products.find(p => p._id === id));
  const [imageIndex, setImageIndex] = useState(0);
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  useEffect(() => { setQty(1); }, [id]);
  useEffect(() => {
    const found = products.find(p => p._id === id);
    if (found) setProduct(found);
    if (!id.startsWith("demo-")) api(`/products/${id}`).then(d => setProduct(d.product)).catch(() => {});
  }, [id, products]);
  if (!product) return <main className="page"><p>Loading product…</p></main>;
  const buy = () => {
    if (product.sizes?.length && !size) return alert("Please select a size first.");
    onAdd(product, size, qty);
    if (!customer) navigate("/login", { state:{ from:"/checkout" } });
    else navigate("/checkout");
  };
  return <main className="page product-detail">
    <div className="breadcrumbs"><Link to="/">Home</Link> / {product.category} / {product.name}</div>
    <div className="detail-layout"><div className="gallery"><div className="main-photo"><img src={product.images?.[imageIndex]} alt={product.name}/><span>{imageIndex+1} / {product.images?.length || 1}</span></div><div className="thumbs">{(product.images || []).slice(0,8).map((src,i)=><button className={imageIndex===i?"selected":""} key={src+i} onClick={()=>setImageIndex(i)}><img src={src} alt={`${product.name} view ${i+1}`}/></button>)}</div><div className="gallery-controls"><button onClick={()=>setImageIndex((imageIndex+(product.images?.length||1)-1)%(product.images?.length||1))}>← Previous</button><button onClick={()=>setImageIndex((imageIndex+1)%(product.images?.length||1))}>Next →</button></div></div>
    <div className="detail-info"><div className="eyebrow">{product.category}</div><h1>{product.name}</h1><div className="rating">★ {Number(product.averageRating||0).toFixed(1)} <span>({product.reviewCount||0} reviews)</span></div><div className="detail-price">{money(product.price)}</div><p className="detail-description">{product.description}</p><div className={`stock-note${product.stock <= 5 ? " low" : ""}`}>{product.stock > 5 ? `✓ In stock · ${product.stock} available` : product.stock > 0 ? `Only ${product.stock} left — order soon` : "Currently out of stock"}</div>
    {product.stock > 0 && <div className="qty-select"><b>Quantity</b><div className="quantity"><button onClick={()=>setQty(q=>Math.max(1,q-1))} aria-label="Decrease quantity">−</button><span>{qty}</span><button onClick={()=>setQty(q=>Math.min(product.stock,99,q+1))} disabled={qty>=Math.min(product.stock,99)} aria-label="Increase quantity">＋</button></div></div>}
    {product.sizes?.length > 0 && <div className="size-select"><div><b>{product.category==="Electronics"?"Select option":"Select size"}</b><span>{size || "Choose one"}</span></div><div className="size-options">{product.sizes.map(s=><button className={size===s?"selected":""} key={s} onClick={()=>setSize(s)}>{s}</button>)}</div></div>}
    <div className="delivery-box"><b>↗ Estimated delivery</b><span>{fmtDate(new Date(Date.now()+5*86400000))} · Estimate only</span><small>Enter your full address at checkout to confirm delivery options.</small></div><div className="seller-box"><span>Sold by</span><b>{product.sellerName || "ShopSphere Marketplace"}</b></div>
    <div className="detail-actions"><button className="button button-outline" disabled={!product.stock} onClick={()=>{if(product.sizes?.length&&!size)return alert("Please select a size first.");onAdd(product,size,qty);}}>Add to cart</button><button className="button button-dark" disabled={!product.stock} onClick={buy}>Buy now ↗</button></div><p className="secure-note">♡ Easy browsing · Secure account · Demo checkout</p></div></div>
    <ProductReview
  productId={product._id}
  productName={product.name}
  canReview={!!customer}
  onReviewAdded={(p) => p && setProduct(p)}
/>
  </main>;
}

function AuthPage({ mode, setCustomer, onDone }) {
  const [isRegister, setIsRegister] = useState(mode === "register");
  const [form, setForm] = useState({ name:"", email:"", password:"" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => setIsRegister(mode === "register"), [mode]);
  const submit = async e => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const data = await api(isRegister?"/auth/register":"/auth/login", { method:"POST", body:JSON.stringify(form) });
      setCustomer(data.customer); await onDone();
      navigate(location.state?.from && location.state.from !== "/login" ? location.state.from : "/");
    } catch(e) { setError(e.message + (e.message.includes("fetch") ? " — make sure the backend is running." : "")); }
    finally { setBusy(false); }
  };
  return <main className="auth-page"><div className="auth-visual"><div className="eyebrow">WELCOME TO SHOPSPHERE</div><h2>Good finds<br/><em>start here.</em></h2><p>Your everyday favourites, all in one thoughtful place.</p><img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1000" alt="Shopping fashion" /></div><div className="auth-form-wrap"><form className="auth-form" onSubmit={submit}><span className="eyebrow">{isRegister?"YOUR NEXT CHAPTER":"GOOD TO SEE YOU AGAIN"}</span><h1>{isRegister?"Create your account":"Welcome back."}</h1><p>{isRegister?"Sign up to save your cart and keep track of orders.":"Log in to continue where you left off."}</p>
    {isRegister && <label>Full name<input required autoComplete="name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name"/></label>}
    <label>Email address<input required type="email" autoComplete="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com"/></label>
    <label>Password<input required minLength={8} type="password" autoComplete={isRegister?"new-password":"current-password"} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="At least 8 characters"/></label>
    {error && <div className="form-error">{error}</div>}<button className="button button-dark full" disabled={busy}>{busy?"Please wait…":isRegister?"Create account":"Log in"}</button>
    <div className="auth-switch">{isRegister?"Already have an account?":"New around here?"} <button type="button" onClick={()=>{setIsRegister(!isRegister);setError("");}}>{isRegister?"Log in":"Sign up"}</button></div>
    <Link className="guest-link" to="/">← Continue browsing as a guest</Link>
    </form></div></main>;
}

function CartPage({ cart, changeQuantity, removeItem, customer, navigate, setToast }) {
  const subtotal = cart.reduce((s,i)=>s+(i.product?.price||0)*i.quantity,0);
  const fee = subtotal === 0 || subtotal >= 2000 ? 0 : 50;
  const proceed = () => {
    if (!cart.length) return;
    if (!customer) { navigate("/login", { state:{ from:"/checkout" } }); return; }
    navigate("/checkout");
  };
  return <main className="page"><div className="page-title"><div className="eyebrow">YOUR PICKS</div><h1>Your <em>cart.</em></h1><p>{cart.length ? `${cart.length} item type${cart.length===1?"":"s"} ready for you` : "A good find is just around the corner."}</p></div>
    {!cart.length ? <div className="empty-state"><div className="empty-icon">♡</div><h2>Your cart is taking a little break.</h2><p>You haven't added any products yet.</p><Link className="button button-dark" to="/">Start shopping ↗</Link></div> :
    <div className="cart-layout"><div className="cart-items">{cart.map((item,idx)=><article className="cart-item" key={item.cartItemId||`${item.productId}-${item.selectedSize}-${idx}`}><Link to={`/product/${item.product?._id}`}><img src={item.product?.images?.[0]} alt={item.product?.name}/></Link><div className="cart-item-info"><span className="eyebrow">{item.product?.category}</span><Link to={`/product/${item.product?._id}`}><h3>{item.product?.name}</h3></Link>{item.selectedSize&&<p>{item.product?.category==="Electronics"?"Option":"Size"}: {item.selectedSize}</p>}<div className="quantity"><button onClick={()=>changeQuantity(item,item.quantity-1)}>−</button><span>{item.quantity}</span><button onClick={()=>changeQuantity(item,item.quantity+1)} disabled={item.quantity>=Math.min(item.product?.stock ?? 99,99)} aria-label="Increase quantity">＋</button></div>{item.product && item.product.stock <= 5 && <p className="stock-warning">{item.product.stock > 0 ? `Only ${item.product.stock} in stock` : "Out of stock"}</p>}</div><div className="cart-item-price"><b>{money((item.product?.price||0)*item.quantity)}</b><button onClick={()=>removeItem(item)}>Remove</button></div></article>)}</div>
    <aside className="summary-card"><h3>Order summary</h3><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>Delivery</span><b>{fee===0?"Free":money(fee)}</b></div><div className="summary-total"><span>Total</span><b>{money(subtotal+fee)}</b></div><button className="button button-dark full" onClick={proceed}>Continue to checkout ↗</button><p>Delivery address will be confirmed at checkout.</p></aside></div>}
  </main>;
}

function CheckoutPage({ cart, customer, setCart, setToast, navigate, onOrderPlaced }) {
  const [address,setAddress] = useState({street:"",city:"",state:"Tamil Nadu",postalCode:"",country:"India"});
  const [phone,setPhone] = useState(customer?.phone || "");
  const [method,setMethod] = useState("online");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const subtotal=cart.reduce((s,i)=>s+(i.product?.price||0)*i.quantity,0);
  const fee=subtotal===0||subtotal>=2000?0:50;
  useEffect(()=>{ if(!customer) navigate("/login",{state:{from:"/checkout"}}); },[customer,navigate]);
  useEffect(()=>{ if(customer?.phone) setPhone(p=>p||customer.phone); },[customer]);
  const submit = async e => {
    e.preventDefault(); if(!cart.length)return setError("Your cart is empty.");
    setBusy(true);setError("");
    try {
      const items=cart.map(i=>({productId:i.productId,quantity:i.quantity,selectedSize:i.selectedSize||""}));
      if(method==="cod"){
        const placed=await api("/payments/cod",{method:"POST",body:JSON.stringify({deliveryAddress:address,items,phone})});
        setCart([]);localStorage.removeItem("shopsphere-guest-cart");onOrderPlaced?.();
        setToast("Order placed. Pay in cash when it arrives.");navigate(`/order/${placed.order._id}`);
        return;
      }
      const data=await api("/payments/checkout",{method:"POST",body:JSON.stringify({deliveryAddress:address,items,phone})});
      if(!window.Cashfree) throw new Error("The payment page could not load. Check your internet and try again.");
      const cashfree=window.Cashfree({mode:data.mode});
      await cashfree.checkout({paymentSessionId:data.paymentSessionId,redirectTarget:"_self"});
    } catch(e){setError(e.message);setBusy(false);}
  };
  return <main className="page checkout-page"><div className="page-title"><div className="eyebrow">ALMOST YOURS</div><h1>Check <em>out.</em></h1><p>Confirm where your finds should arrive.</p></div><div className="checkout-layout"><form className="address-form" onSubmit={submit}><h2>Delivery address</h2><p>We need a complete address to estimate delivery.</p><label>Street address<input required value={address.street} onChange={e=>setAddress({...address,street:e.target.value})} placeholder="House number, street, area"/></label><div className="form-row"><label>City<input required value={address.city} onChange={e=>setAddress({...address,city:e.target.value})} placeholder="City"/></label><label>State<input required value={address.state} onChange={e=>setAddress({...address,state:e.target.value})}/></label></div><div className="form-row"><label>PIN / postal code<input required value={address.postalCode} onChange={e=>setAddress({...address,postalCode:e.target.value})} placeholder="Postal code"/></label><label>Country<input required value={address.country} onChange={e=>setAddress({...address,country:e.target.value})}/></label></div><label>Mobile number<input required inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,""))} placeholder="10-digit mobile number"/></label><h2 className="pay-title">Payment method</h2><div className="pay-options"><label className={method==="online"?"pay-option on":"pay-option"}><input type="radio" name="pay" checked={method==="online"} onChange={()=>setMethod("online")}/><span><b>Pay online</b><small>UPI, card or net banking</small></span></label><label className={method==="cod"?"pay-option on":"pay-option"}><input type="radio" name="pay" checked={method==="cod"} onChange={()=>setMethod("cod")}/><span><b>Cash on delivery</b><small>Pay in cash when your order arrives</small></span></label></div>{error&&<div className="form-error">{error}</div>}<button className="button button-dark full" disabled={busy||!cart.length}>{busy?(method==="cod"?"Placing order…":"Opening payment…"):method==="cod"?`Place order · ${money(subtotal+fee)} on delivery`:`Pay ${money(subtotal+fee)} securely`}</button><small className="demo-warning">{method==="cod"?"Please keep the exact amount ready when your order arrives.":"You will pay on Cashfree's secure page with UPI, card or net banking."}</small></form><aside className="summary-card"><h3>Your order</h3>{cart.map((i,idx)=><div className="checkout-line" key={idx}><img src={i.product?.images?.[0]} alt=""/><span>{i.product?.name} × {i.quantity}{i.selectedSize?` · ${i.selectedSize}`:""}</span><b>{money(i.product?.price*i.quantity)}</b></div>)}<div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>Delivery</span><b>{fee?money(fee):"Free"}</b></div><div className="summary-total"><span>Total</span><b>{money(subtotal+fee)}</b></div></aside></div></main>;
}

function ProfilePage({ customer, setCustomer, signOut }) {
  const [bio,setBio]=useState(customer?.bio||"");
  const [name,setName]=useState(customer?.name||"");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  useEffect(()=>{setBio(customer?.bio||"");setName(customer?.name||"");},[customer]);
  if(!customer)return <main className="page empty-state"><h2>Your profile is waiting.</h2><p>Log in to view your information.</p><Link className="button button-dark" to="/login">Log in</Link></main>;
  const save=async e=>{e.preventDefault();setBusy(true);setMessage("");try{const data=await api("/customers/me",{method:"PATCH",body:JSON.stringify({name,bio})});setCustomer(data.customer);setMessage("Profile updated.");}catch(e){setMessage(e.message);}finally{setBusy(false);}};
  return <main className="page profile-page"><div className="page-title"><div className="eyebrow">YOUR SPACE</div><h1>Hello, <em>{customer.name}.</em></h1><p>Everything you need, all in one place.</p></div><div className="profile-layout"><aside className="profile-sidebar"><div className="profile-avatar">{customer.name?.[0]?.toUpperCase()}</div><h2>{customer.name}</h2><p>{customer.email}</p><Link to="/orders" className="sidebar-link">▤ Previous orders ↗</Link><button className="sidebar-link" onClick={signOut}>↗ Sign out</button></aside><form className="profile-form" onSubmit={save}><h2>Your information</h2><label>Full name<input value={name} required onChange={e=>setName(e.target.value)}/></label><label>Email address<input value={customer.email} disabled/></label><label>Bio<textarea rows="4" maxLength="300" value={bio} onChange={e=>setBio(e.target.value)} placeholder="A little about you…"/></label>{message&&<p className={message.includes("updated")?"success-text":"form-error"}>{message}</p>}<button className="button button-dark" disabled={busy}>{busy?"Saving…":"Save changes"}</button></form></div></main>;
}

function OrdersPage({ customer }) {
  const [orders,setOrders]=useState([]);
  const [error,setError]=useState("");
  useEffect(()=>{api("/orders").then(d=>setOrders(d.orders)).catch(e=>setError(e.message));},[]);
  if(!customer)return <main className="page empty-state"><h2>Log in to view your orders.</h2><Link className="button button-dark" to="/login" state={{from:"/orders"}}>Log in</Link></main>;
  return <main className="page"><div className="page-title"><div className="eyebrow">THE THINGS YOU CHOSE</div><h1>Previous <em>orders.</em></h1><p>Your purchases, all together.</p></div>{error&&<p className="form-error">{error}</p>}{!orders.length&&!error?<div className="empty-state"><div className="empty-icon">▤</div><h2>No orders just yet.</h2><p>Your future favourites will show up here.</p><Link className="button button-dark" to="/">Start exploring</Link></div>:<div className="orders-list">{orders.map(o=><Link className="order-card" to={`/order/${o._id}`} key={o._id}><div className="order-head"><span>ORDER PLACED <b>{fmtDate(o.orderedAt)}</b></span><span>STATUS <b>{o.status}</b></span><span>ORDER TOTAL <b>{money(o.totalAmount)}</b></span></div><div className="order-body"><div className="order-thumbs">{o.items.slice(0,3).map((i,idx)=><img key={idx} src={i.image} alt=""/>)}</div><div><h3>{o.items.map(i=>i.productName).join(", ")}</h3><p>{o.items.reduce((s,i)=>s+i.quantity,0)} item(s) · Est. delivery {fmtDate(o.estimatedDeliveryAt)}</p><small>Actual delivery: {fmtDate(o.deliveredAt)}</small></div><span className="order-arrow">↗</span></div></Link>)}</div>}</main>;
}

function OrderPage({ customer }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/orders/${id}`).then(d => setOrder(d.order)).catch(e => setError(e.message));}, [id]);

  const handleCancelOrder = async () => {
    const confirmCancel = window.confirm(order?.paymentStatus === "Paid" ? "Cancel this order? Your payment will be refunded." : "Are you sure you want to cancel this order?");

    if (!confirmCancel) return;

    try {
      const data = await api(`/orders/${id}`, {method: "DELETE"});
      alert(data.message || "Order cancelled successfully!");
      navigate("/orders");
    } catch (error) {
      console.error("Cancel order error:", error);
      alert(error.message || "Unable to cancel order.");
    }
  };

  const handleReturn = async () => {
    const reason = window.prompt("Why do you want to return this order?");
    if (!reason || !reason.trim()) return;
    try {
      const data = await api(`/orders/${id}/return`, { method: "POST", body: JSON.stringify({ reason }) });
      setOrder(data.order);
      alert(data.message);
    } catch (error) {
      alert(error.message || "Unable to request a return.");
    }
  };

  if (!customer) {
    return (
      <main className="page">
        <Link to="/login">Log in to view this order</Link>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page">
        <p className="form-error">{error}</p>
        <Link to="/orders">Back to orders</Link>
      </main>
    );
  }

  if (!order) {
    return <main className="page">Loading order…</main>;
  }

  return (
    <main className="page">
      <div className="page-title">
        <div className="eyebrow">ORDER DETAILS</div>
        <h1>Order <em>summary.</em></h1>
        <p>
          Placed on {fmtDate(order.orderedAt)} · {order._id}
        </p>

        {["OrderPlaced", "Processing"].includes(order.status) && !(order.paymentStatus === "Pending" && order.gatewayOrderId) && !(order.estimatedDeliveryAt && new Date(order.estimatedDeliveryAt) <= new Date()) && (
          <button
            className="button button-dark"
            onClick={handleCancelOrder}
          >
            Cancel Order
          </button>
        )}
        {order.status === "Delivered" && order.deliveredAt && (!order.returnStatus || order.returnStatus === "None") && (() => {
          const lastDay = new Date(new Date(order.deliveredAt).getTime() + 7 * 24 * 60 * 60 * 1000);
          return new Date() <= lastDay
            ? <><button className="button button-dark" onClick={handleReturn}>Return order</button><p>You can return this order until {fmtDate(lastDay)}.</p></>
            : <p>The 7-day return period ended on {fmtDate(lastDay)}.</p>;
        })()}
        {order.returnStatus && order.returnStatus !== "None" && (
          <p>Return: <b>{{ Requested: "Requested. We will contact you about pickup.", Approved: order.paymentMethod === "COD" ? "Approved. Your refund will be sent to you soon." : "Approved.", Rejected: "Rejected. Please contact support.", Refunded: "Refunded. It can take a few working days to reach you." }[order.returnStatus]}</b></p>
        )}
      </div>

      <div className="order-detail-layout">
        <div className="cart-items">
          {order.items.map((i, idx) => (
            <div key={idx}>
              <article className="cart-item">
                <img src={i.image} alt="" />
                  <div className="cart-item-info">
                      <h3>{i.productName}</h3>
                        <p>
                          Qty {i.quantity}{i.selectedSize ? ` · Size ${i.selectedSize}` : ""}
                        </p>
                    </div>

                  <b>{money(i.subtotal)}</b>
              </article>

              <ProductReview
                productId={String(i.productId?._id || i.productId)}
                productName={i.productName}
                canReview={true}
              />
            </div>
))}
        </div>

        <aside className="summary-card">
          <h3>Delivery & payment</h3>
          <div>
            <span>Status</span>
            <b>{order.status}</b>
          </div>
          <div>
            <span>Estimated delivery</span>
            <b>{fmtDate(order.estimatedDeliveryAt)}</b>
          </div>
          <div>
            <span>Delivered on</span>
            <b>{fmtDate(order.deliveredAt)}</b>
          </div>
          <div>
            <span>Payment</span>
            <b>{order.paymentMethod === "COD" ? "Cash on delivery" : order.paymentMethod === "Cashfree" ? `Online · ${order.paymentStatus}` : order.paymentStatus}</b>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <b>{money(order.totalAmount)}</b>
          </div>
          <p>
            {order.deliveryAddress.street}, {order.deliveryAddress.city},{" "}
            {order.deliveryAddress.state} {order.deliveryAddress.postalCode},{" "}
            {order.deliveryAddress.country}
          </p>
        </aside>
      </div>
   
    </main>
  );
}

const sellCategories = categories.filter(c => c !== "All");
// Only these categories have the Sizes / variants box. Hidden for Food and Accessories.
// For Electronics it is optional: use it for phones/laptops (128GB, 256GB), leave it empty for TV, mixer, grinder.
const sizedCategories = ["Men's Wear", "Women's Wear", "Kids' Wear", "Shoes", "Sports", "Electronics"];
const sizeHint = category =>
  category === "Shoes" ? "6, 7, 8, 9, 10" :
  category === "Kids' Wear" ? "2-3Y, 4-5Y, 6-7Y" :
  category === "Electronics" ? "128GB, 256GB  (leave empty for TV, mixer, grinder)" :
  "S, M, L, XL";
const emptySellForm = { name:"", category:sellCategories[0], price:"", stock:"", sizes:"", description:"", imageUrls:"" };

function SellPage({ customer, setToast, refreshProducts }) {
  const [form,setForm]=useState(emptySellForm);
  const [files,setFiles]=useState([]);
  const [previews,setPreviews]=useState([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [mine,setMine]=useState([]);
  const [loadingMine,setLoadingMine]=useState(true);

  const loadMine=useCallback(async()=>{
    try{const d=await api("/products/mine");setMine(d.products);}
    catch(e){setError(e.message);}
    finally{setLoadingMine(false);}
  },[]);
  useEffect(()=>{if(customer)loadMine();else setLoadingMine(false);},[customer,loadMine]);

  useEffect(()=>{
    const urls=files.map(f=>URL.createObjectURL(f));
    setPreviews(urls);
    return ()=>urls.forEach(u=>URL.revokeObjectURL(u));
  },[files]);

  const set=key=>e=>setForm({...form,[key]:e.target.value});
  const onFiles=e=>{
    // Copy the chosen files FIRST. Clearing the input below empties the live file list,
    // so it must not be read afterwards (that was the cause of photos silently not being added).
    const picked=Array.from(e.target.files);
    e.target.value="";
    const okTypes=["image/jpeg","image/png","image/webp","image/gif"];
    const good=picked.filter(f=>okTypes.includes(f.type)&&f.size<=5*1024*1024);
    const skipped=picked.filter(f=>!good.includes(f));
    setError(skipped.length?`Skipped ${skipped.map(f=>f.name).join(", ")}: only JPG, PNG, WEBP or GIF up to 5 MB are allowed.`:"");
    if(good.length)setFiles(prev=>[...prev,...good].slice(0,8));
  };
  const removeFile=i=>setFiles(prev=>prev.filter((_,idx)=>idx!==i));
  const changed=async()=>{await loadMine();refreshProducts();};

  const submit=async e=>{
    e.preventDefault();setError("");
    const linkCount=form.imageUrls.split(/\s+/).filter(Boolean).length;
    if(files.length+linkCount<1)return setError("Add at least one product image (upload a photo or paste an image link).");
    if(files.length+linkCount>8)return setError("A product can have at most 8 images.");
    const body=new FormData();
    Object.entries(form).forEach(([k,v])=>body.append(k,v));
    files.forEach(f=>body.append("images",f));
    setBusy(true);
    try{
      await api("/products",{method:"POST",body});
      setToast("Your product is now listed for sale");
      setForm(emptySellForm);setFiles([]);
      await changed();
    }catch(err){setError(err.message);}
    finally{setBusy(false);}
  };

  if(!customer)return <main className="page empty-state"><h2>Log in to sell a product.</h2><p>Your listings are saved to your account.</p><Link className="button button-dark" to="/login" state={{from:"/sell"}}>Log in</Link></main>;

  return <main className="page sell-page">
    <div className="page-title"><div className="eyebrow">START SELLING</div><h1>Sell your <em>product.</em></h1><p>List an item with its quantity. Customers can buy it straight away, and the stock goes down with every order.</p></div>
    <div className="sell-layout">
      <form className="address-form sell-form" onSubmit={submit}>
        <h2>Product details</h2>
        <p>Everything here is saved to the database when you press “List product”.</p>
        <label>Product name<input required maxLength={120} value={form.name} onChange={set("name")} placeholder="e.g. Handmade leather wallet"/></label>
        <div className="form-row">
          <label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value,sizes:sizedCategories.includes(e.target.value)?form.sizes:""})}>{sellCategories.map(c=><option key={c}>{c}</option>)}</select></label>
          <label>Price (₹)<input required type="number" min="1" step="any" value={form.price} onChange={set("price")} placeholder="799"/></label>
        </div>
        <div className="form-row">
          <label>Quantity in stock<input required type="number" min="0" step="1" value={form.stock} onChange={set("stock")} placeholder="e.g. 25"/></label>
          {sizedCategories.includes(form.category)&&<label>{form.category==="Electronics"?"Storage / variants (optional)":"Sizes (optional)"}<input value={form.sizes} onChange={set("sizes")} placeholder={sizeHint(form.category)}/></label>}
        </div>
        <label>Description<textarea rows="4" maxLength={2000} value={form.description} onChange={set("description")} placeholder="Tell buyers what makes this product good…"/></label>
        <label>Photos (up to 8)<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={onFiles}/></label>
        {previews.length>0&&<div className="preview-grid">{previews.map((src,i)=><div key={src}><img src={src} alt={`Selected ${i+1}`}/><button type="button" onClick={()=>removeFile(i)} aria-label="Remove photo">×</button></div>)}</div>}
        <label>…or paste image links (optional)<textarea rows="2" value={form.imageUrls} onChange={set("imageUrls")} placeholder="One link per line, starting with https://"/></label>
        <small className="hint">JPG, PNG, WEBP or GIF · max 5 MB each · 8 images in total (photos + links).</small>
        {error&&<div className="form-error">{error}</div>}
        <button className="button button-dark full" disabled={busy}>{busy?"Listing…":"List product ↗"}</button>
      </form>

      <section className="my-products">
        <h2>Your listings</h2>
        {loadingMine?<p className="hint">Loading…</p>:!mine.length?<div className="empty-state"><div className="empty-icon">▤</div><h3>Nothing listed yet.</h3><p>Products you list will show up here with live stock and sold counts.</p></div>:mine.map(p=><MyProductRow key={p._id} product={p} onChanged={changed} setToast={setToast}/>)}
      </section>
    </div>
  </main>;
  
}

function MyProductRow({ product, onChanged, setToast }) {
  const [price,setPrice]=useState(String(product.price));
  const [addStock,setAddStock]=useState("");
  const [busy,setBusy]=useState(false);
  useEffect(()=>setPrice(String(product.price)),[product.price]);

  const save=async()=>{
    const body={};
    if(Number(price)!==product.price)body.price=price;
    if(addStock!=="")body.addStock=addStock;
    if(!Object.keys(body).length)return setToast("Nothing to update");
    setBusy(true);
    try{await api(`/products/${product._id}`,{method:"PATCH",body:JSON.stringify(body)});setAddStock("");setToast("Listing updated");await onChanged();}
    catch(e){setToast(e.message);}
    finally{setBusy(false);}
  };
  const remove=async()=>{
    if(!window.confirm(`Remove “${product.name}” from sale? Past orders keep their records.`))return;
    setBusy(true);
    try{await api(`/products/${product._id}`,{method:"DELETE"});setToast("Listing removed");await onChanged();}
    catch(e){setToast(e.message);setBusy(false);}
  };

  return <article className="my-product">
    <img src={product.images?.[0]} alt=""/>
    <div className="my-product-main">
      <Link to={`/product/${product._id}`}><h3>{product.name}</h3></Link>
      <span>{product.category} · {money(product.price)}</span>
      <div className="my-product-stats">
        <div><span>In stock</span><b className={product.stock<=0?"zero":""}>{product.stock}</b></div>
        <div><span>Sold</span><b>{product.soldQty||0}</b></div>
      </div>
    </div>
    <div className="my-product-edit">
      <label>Price (₹)<input type="number" min="1" step="any" value={price} onChange={e=>setPrice(e.target.value)}/></label>
      <label>Add stock<input type="number" min="1" step="1" placeholder="+0" value={addStock} onChange={e=>setAddStock(e.target.value)}/></label>
      <div className="my-product-actions"><button className="button button-dark small" onClick={save} disabled={busy}>Save</button><button className="text-button" onClick={remove} disabled={busy}>Delete</button></div>
    </div>
  </article>;
}

function About() {
  return <main className="page about-page"><div className="eyebrow">A LITTLE ABOUT US</div><h1>Good things should be<br/><em>easy to find.</em></h1><p>ShopSphere is a demo shopping experience built around discovering useful, thoughtful products without the fuss. Browse freely, find something you love, and keep your shopping details in one place when you sign in.</p><Link className="button button-dark" to="/">Explore the collection ↗</Link></main>;
}
function Tems() {
  return <main className="page about-page"><div className="eyebrow">TERMS OF SERVICE</div><h1>Terms of <em>Service.</em></h1><p>
    <h2>Terms and Conditions</h2> 
<h3>1. Acceptance of Terms</h3>

By accessing or using [Project Name], you agree to be bound by these Terms and our Privacy Policy. If you do not agree, please do not use the service.
<br />
<h3>2. Eligibility</h3>
<br />
You must be at least [18] years old, or have the consent of a parent or guardian, and be legally able to enter into a binding agreement.
<br />
<h3>3. Your Account</h3>
You must provide accurate, current information.<br />
You are responsible for keeping your login details confidential and for all activity under your account.<br />
Notify us immediately of any unauthorised use.<br/>  

<h3>4. Acceptable Use</h3>  
<br />  
You agree not to:
<br />
Break any law or infringe anyone’s rights.
Upload harmful, abusive, defamatory, or unlawful content, or malware.
Attempt to hack, overload, scrape, reverse engineer, or disrupt the service.
Impersonate others or misrepresent your affiliation.
Use the service to send spam or unsolicited promotions.

We may suspend or terminate accounts that violate these rules.

<h3>5. Intellectual Property</h3>

All software, design, text, logos, and other materials in [Project Name] are owned by [Operator] or its licensors and protected by intellectual property laws. We grant you a limited, non-exclusive, non-transferable, revocable licence to use the service for its intended purpose. You may not copy, modify, distribute, or create derivative works without written permission.

<h3>6. User Content</h3>

You retain ownership of content you submit. By submitting it, you grant us a worldwide, non-exclusive, royalty-free licence to host, store, display, and process it solely to operate and improve the service. You confirm that you have the rights to submit it and that it does not violate any law or third-party right.

<h3>7. Payments and Refunds (if applicable)</h3>

Fees, billing cycles, taxes, and refund terms are as stated at the time of purchase. [Example: “Fees are non-refundable except where required by law.”]

<h3>8. Third-Party Services</h3>

The service may integrate third-party tools. Your use of them is governed by their own terms, and we are not responsible for them.

<h3>9. Disclaimer of Warranties</h3>

The service is provided “as is” and “as available”, without warranties of any kind, express or implied, including fitness for a particular purpose, accuracy, or uninterrupted availability.

<h3>10. Limitation of Liability</h3>

To the fullest extent permitted by law, [Operator] is not liable for any indirect, incidental, special, or consequential damages, or loss of data, profits, or goodwill arising from your use of the service. Our total liability for any claim is limited to the amount you paid us in the [12] months before the claim, or [INR 1,000] if you paid nothing.

<h3>11. Indemnification</h3>

You agree to indemnify and hold harmless [Operator] from claims, damages, and expenses (including reasonable legal fees) arising from your breach of these Terms or misuse of the service.

<h3>12. Termination</h3>

You may stop using the service or delete your account at any time. We may suspend or terminate your access, with or without notice, if you violate these Terms or if required by law. Clauses that by nature should survive termination (intellectual property, disclaimers, liability, governing law) will continue to apply.

<h3>13. Changes to the Service and Terms</h3>

We may modify or discontinue features, and may update these Terms. Continued use after changes take effect means you accept them. We will notify you of material changes.

<h3>14. Governing Law and Dispute Resolution</h3>

These Terms are governed by the laws of India. Disputes will first be attempted to be resolved amicably; failing that, they are subject to the exclusive jurisdiction of the courts at [City], Tamil Nadu [or arbitration under the Arbitration and Conciliation Act, 1996, seated in [City]].

<h3>15. General</h3>
Entire agreement: These Terms and the Privacy Policy form the whole agreement between you and us.
Severability: If any provision is unenforceable, the rest remains in effect.
No waiver: Failure to enforce a right is not a waiver of it.
Assignment: You may not transfer your rights without our consent.

<h3>16. Contact Us</h3>

Mahidharshan S S
Email: mahidharshan09@gmail.com
Address: Tiruchengode, Namakkal, Tamil Nadu, India
</p><Link className="button button-dark" to="/">Back to home ↗</Link></main>;
}
function Privacy() {
  return <main className="page about-page"><div className="eyebrow">PRIVACY POLICY</div><h1>Your <em>privacy.</em></h1><p>
  <h1>Privacy Policy</h1>

Project: ShopSphere
Operator: Astroblock Technologies Pvt. Ltd.
Contact: mahidharshan09@gmail.com
Effective date: [DD Month YYYY]

<h3>1. Introduction</h3>

ShopSphere respects your privacy. This policy explains what personal information we collect, why we collect it, how we use and protect it, and the choices you have. By using ShopSphere, you agree to this policy.

<h3>2. Information We Collect</h3>
Information you give us: name, email address, phone number, account credentials, and any content you submit.
Information collected automatically: device type, browser, IP address, pages visited, and usage logs.
Cookies and similar technologies: used to keep you signed in, remember preferences, and understand how the service is used.
Information from third parties: such as sign-in providers (Google, etc.), if applicable.

We do not knowingly collect sensitive information (such as financial or health data) unless it is essential to the service and you have clearly consented.

<h3>3. How We Use Your Information</h3>
To provide, maintain, and improve the service.
To create and manage your account.
To communicate with you about updates, support, and security.
To detect and prevent fraud, abuse, and security incidents.
To comply with legal obligations.

We use your information only for the purposes stated here, or with your consent.

<h3>4. Sharing of Information</h3>

We do not sell your personal information. We may share it only with:

Service providers (hosting, analytics, email, payments) who process data on our behalf under confidentiality obligations.
Legal authorities, when required by law or to protect rights and safety.
A successor, in case of a merger, acquisition, or sale of the project, with notice to you.
<h3>5. Data Retention</h3>

We keep your information only as long as needed for the purposes above or as required by law. When you delete your account, we delete or anonymize your data within [30] days, except where we must retain it legally.

<h3>6. Data Security</h3>

We use reasonable technical and organisational measures, such as encryption in transit, access controls, and regular reviews, to protect your data. No system is completely secure, so we cannot guarantee absolute security. If a breach affecting you occurs, we will notify you and the relevant authorities as required by law.

<h3>7. Your Rights</h3>

Subject to applicable law (including India’s Digital Personal Data Protection Act, 2023, and, where relevant, GDPR), you may:

Access the personal data we hold about you.
Correct inaccurate or incomplete data.
Request deletion of your data.
Withdraw consent at any time.
Nominate another person to exercise your rights if you are unable to.
Raise a grievance with us, and escalate to the relevant data protection authority if unresolved.

To exercise these rights, contact us at [email address]. We will respond within [30] days.

<h3>8. Children’s Privacy</h3>

ShopSphere is not intended for children under [18] years. We do not knowingly collect data from children without verifiable parental consent. If you believe a child has provided us data, contact us and we will delete it.

<h3>9. Third-Party Links and Services</h3>

The service may link to third-party sites or use third-party tools. We are not responsible for their privacy practices; please review their policies.

<h3>10. International Transfers</h3>

Your data may be stored or processed in [country/region]. Where data is transferred across borders, we take steps to ensure appropriate protection.

<h3>11. Changes to This Policy</h3>

We may update this policy from time to time. We will post the new version with an updated effective date and notify you of significant changes.

<h3>12. Grievance Officer / Contact</h3>

Mahidharshan, Grievance Officer
Email: mahidharshan09@gmail.com
Address:  Tiruchengode,Namakkal</p><Link className="button button-dark" to="/">Back to home ↗</Link></main>;
}

export default App;
