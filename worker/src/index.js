const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };
const COOKIE_NAME = "zh_admin_session";
const SESSION_SECONDS = 60 * 60 * 12;

function origin(request, env) {
  return env.FRONTEND_ORIGIN || new URL(request.url).origin;
}

function cors(request, env) {
  const requested = request.headers.get("Origin") || "";
  const allowed = origin(request, env);
  return {
    "Access-Control-Allow-Origin": requested === allowed ? allowed : allowed,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Vary": "Origin",
  };
}

function json(data, status = 200, request, env, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...cors(request, env), ...extra },
  });
}

function text(data, status = 200, request, env, extra = {}) {
  return new Response(data, {
    status,
    headers: { ...cors(request, env), ...extra },
  });
}

async function sha256Base64Url(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(digest));
}

function toBase64Url(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

async function safeEqual(a, b) {
  const ua = new TextEncoder().encode(a);
  const ub = new TextEncoder().encode(b);
  if (ua.length !== ub.length) return false;
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}

async function makeSession(env) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const nonce = crypto.randomUUID();
  const payload = exp + "." + nonce;
  const signature = await hmac(env.ADMIN_SECRET, payload);
  return payload + "." + signature;
}

async function isAdmin(request, env) {
  if (!env.ADMIN_SECRET) return false;
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp("(^|;\\\\s*)" + COOKIE_NAME + "=([^;]+)"));
  if (!match) return false;
  const parts = match[2].split(".");
  if (parts.length !== 3) return false;
  const exp = parts[0], nonce = parts[1], signature = parts[2];
  if (!nonce || Number(exp) < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmac(env.ADMIN_SECRET, exp + "." + nonce);
  return await safeEqual(expected, signature);
}

function setCookie(value) {
  return COOKIE_NAME + "=" + value + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + SESSION_SECONDS;
}

function clearCookie() {
  return COOKIE_NAME + "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

async function bodyJson(request) {
  try { return await request.json(); } catch { return {}; }
}

async function getSetting(env, key, fallback) {
  const row = await env.DB.prepare("SELECT value_json FROM site_settings WHERE key=?").bind(key).first();
  if (!row) return fallback;
  try { return JSON.parse(row.value_json); } catch { return fallback; }
}

async function putSetting(env, key, value) {
  await env.DB.prepare(
    "INSERT INTO site_settings(key,value_json,updated_at) VALUES(?,?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at"
  ).bind(key, JSON.stringify(value)).run();
}

function paymentDeepLink(pureCode) {
  const value = String(pureCode || "").trim();
  if (!value) return "";
  if (value.startsWith("alipays://")) return value;
  return "alipays://platformapi/startapp?saId=10000007&qrcode=" + encodeURIComponent(value);
}

function safeJson(v, fallback) {
  try { return JSON.parse(v || "null") ?? fallback; } catch { return fallback; }
}

function normalizeProduct(r) {
  return {
    id: r.id,
    slug: r.id,
    name: r.name,
    category: r.category,
    tag: r.tag || "",
    subtitle: r.subtitle || "",
    price: Number(r.price || 0),
    sold: Number(r.sold || 0),
    stock: Number(r.stock || 0),
    delivery: r.delivery || "",
    tone: r.tone || "blue",
    detail: r.detail || "",
    tips: safeJson(r.tips_json, []),
    faq: safeJson(r.faq_json, []),
    imageUrl: r.image_url || "",
    enabled: !!r.enabled,
  };
}

async function publicConfig(env) {
  const site = await getSetting(env, "site", {});
  const payments = await getSetting(env, "payments", {
    alipay1: { enabled: true, qrUrl: "", pureCode: "", buttonText: "打开支付宝立即支付" },
    alipay2: { enabled: false, qrUrl: "", link: "", buttonText: "支付宝2支付" },
    wechat: { enabled: true, qrUrl: "", buttonText: "请打开微信扫一扫支付" },
    usdt: { enabled: false, network: "TRC20", address: "", qrUrl: "" }
  });
  payments.alipay1 = payments.alipay1 || {};
  payments.alipay1 = {
    enabled: payments.alipay1.enabled !== false,
    qrUrl: payments.alipay1.qrUrl || "",
    buttonText: payments.alipay1.buttonText || "打开支付宝立即支付",
    deepLink: paymentDeepLink(payments.alipay1.pureCode)
  };
  payments.alipay2 = {
    enabled: payments.alipay2?.enabled !== false,
    qrUrl: payments.alipay2?.qrUrl || "",
    link: payments.alipay2?.link || "",
    buttonText: payments.alipay2?.buttonText || "支付宝2支付"
  };
  payments.wechat = {
    enabled: payments.wechat?.enabled !== false,
    qrUrl: payments.wechat?.qrUrl || "",
    buttonText: payments.wechat?.buttonText || "请打开微信扫一扫支付"
  };
  payments.usdt = {
    enabled: payments.usdt?.enabled === true,
    network: payments.usdt?.network || "TRC20",
    address: payments.usdt?.address || "",
    qrUrl: payments.usdt?.qrUrl || ""
  };
  const rows = await env.DB.prepare(
    "SELECT * FROM products WHERE enabled=1 ORDER BY sort_order ASC, created_at ASC"
  ).all();
  return {
    settings: site,
    payments,
    products: (rows.results || []).map(normalizeProduct)
  };
}

function productPayload(x) {
  return {
    id: String(x.id || crypto.randomUUID()),
    name: String(x.name || "").trim(),
    category: String(x.category || "").trim(),
    tag: String(x.tag || "").trim(),
    subtitle: String(x.subtitle || "").trim(),
    price: Number(x.price || 0),
    sold: Number(x.sold || 0),
    stock: Number(x.stock || 0),
    delivery: String(x.delivery || "").trim(),
    tone: String(x.tone || "blue"),
    detail: String(x.detail || "").trim(),
    tips_json: JSON.stringify(Array.isArray(x.tips) ? x.tips : []),
    faq_json: JSON.stringify(Array.isArray(x.faq) ? x.faq : []),
    image_url: String(x.imageUrl || "").trim(),
    enabled: x.enabled === false ? 0 : 1,
    sort_order: Number(x.sortOrder || 0),
  };
}

async function handleAdmin(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  if (path === "/admin/login" && method === "POST") {
    const body = await bodyJson(request);
    const password = String(body.password || "");
    if (!env.ADMIN_SECRET || !env.ADMIN_PASSWORD) return json({ error: "管理员环境变量尚未配置" }, 500, request, env);
    const expected = await sha256Base64Url(env.ADMIN_PASSWORD);
    const given = await sha256Base64Url(password);
    if (!(await safeEqual(expected, given))) return json({ error: "密码错误" }, 401, request, env);
    const session = await makeSession(env);
    return json({ ok: true }, 200, request, env, { "Set-Cookie": setCookie(session) });
  }

  if (path === "/admin/logout" && method === "POST") {
    return json({ ok: true }, 200, request, env, { "Set-Cookie": clearCookie() });
  }

  if (path === "/admin/me" && method === "GET") {
    return json({ authenticated: await isAdmin(request, env) }, 200, request, env);
  }

  if (!(await isAdmin(request, env))) return json({ error: "未登录或登录已过期" }, 401, request, env);

  if (path === "/admin/dashboard" && method === "GET") {
    const [tot, pending, paid, done, money] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS c FROM orders").first(),
      env.DB.prepare("SELECT COUNT(*) AS c FROM orders WHERE status IN ('待付款','待处理')").first(),
      env.DB.prepare("SELECT COUNT(*) AS c FROM orders WHERE payment_status='已付款'").first(),
      env.DB.prepare("SELECT COUNT(*) AS c FROM orders WHERE status='已完成'").first(),
      env.DB.prepare("SELECT COALESCE(SUM(total),0) AS s FROM orders WHERE payment_status='已付款'").first()
    ]);
    return json({
      totalOrders: Number(tot?.c || 0),
      pendingOrders: Number(pending?.c || 0),
      paidOrders: Number(paid?.c || 0),
      completedOrders: Number(done?.c || 0),
      revenue: Number(money?.s || 0)
    }, 200, request, env);
  }

  if (path === "/admin/products" && method === "GET") {
    const rows = await env.DB.prepare("SELECT * FROM products ORDER BY sort_order ASC, created_at ASC").all();
    return json({ products: (rows.results || []).map(normalizeProduct) }, 200, request, env);
  }

  if (path === "/admin/products" && method === "POST") {
    const p = productPayload(await bodyJson(request));
    if (!p.name || !p.category) return json({ error: "商品名称和分类不能为空" }, 400, request, env);
    await env.DB.prepare(
      "INSERT INTO products(id,name,category,tag,subtitle,price,sold,stock,delivery,tone,detail,tips_json,faq_json,image_url,enabled,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))"
    ).bind(p.id,p.name,p.category,p.tag,p.subtitle,p.price,p.sold,p.stock,p.delivery,p.tone,p.detail,p.tips_json,p.faq_json,p.image_url,p.enabled,p.sort_order).run();
    return json({ ok: true, id: p.id }, 201, request, env);
  }

  const pm = path.match(/^\/admin\/products\/([^/]+)$/);
  if (pm && method === "PUT") {
    const p = productPayload(await bodyJson(request));
    const id = decodeURIComponent(pm[1]);
    await env.DB.prepare(
      "UPDATE products SET name=?,category=?,tag=?,subtitle=?,price=?,sold=?,stock=?,delivery=?,tone=?,detail=?,tips_json=?,faq_json=?,image_url=?,enabled=?,sort_order=?,updated_at=datetime('now') WHERE id=?"
    ).bind(p.name,p.category,p.tag,p.subtitle,p.price,p.sold,p.stock,p.delivery,p.tone,p.detail,p.tips_json,p.faq_json,p.image_url,p.enabled,p.sort_order,id).run();
    return json({ ok: true }, 200, request, env);
  }

  if (pm && method === "DELETE") {
    await env.DB.prepare("DELETE FROM products WHERE id=?").bind(decodeURIComponent(pm[1])).run();
    return json({ ok: true }, 200, request, env);
  }

  if (path === "/admin/orders" && method === "GET") {
    const rows = await env.DB.prepare(
      "SELECT o.*, p.name AS product_name FROM orders o LEFT JOIN products p ON p.id=o.product_id ORDER BY o.created_at DESC LIMIT 200"
    ).all();
    return json({ orders: rows.results || [] }, 200, request, env);
  }

  const om = path.match(/^\/admin\/orders\/([^/]+)$/);
  if (om && method === "PUT") {
    const body = await bodyJson(request);
    const id = decodeURIComponent(om[1]);
    await env.DB.prepare(
      "UPDATE orders SET status=COALESCE(?,status), payment_status=COALESCE(?,payment_status), payment_method=COALESCE(?,payment_method), delivery_content=COALESCE(?,delivery_content), updated_at=datetime('now') WHERE id=?"
    ).bind(body.status ?? null, body.paymentStatus ?? null, body.paymentMethod ?? null, body.deliveryContent ?? null, id).run();
    return json({ ok: true }, 200, request, env);
  }

  if (path === "/admin/settings" && method === "GET") {
    return json({
      site: await getSetting(env, "site", {}),
      payments: await getSetting(env, "payments", {})
    }, 200, request, env);
  }

  if (path === "/admin/settings" && method === "PUT") {
    const body = await bodyJson(request);
    if (body.site) await putSetting(env, "site", body.site);
    if (body.payments) await putSetting(env, "payments", body.payments);
    return json({ ok: true }, 200, request, env);
  }

  if (path === "/admin/upload" && method === "POST") {
    if (!env.ASSETS) return json({ error: "R2 未绑定" }, 500, request, env);
    const form = await request.formData();
    const file = form.get("file");
    const slot = String(form.get("slot") || "");
    if (!(file instanceof File)) return json({ error: "请选择图片文件" }, 400, request, env);
    if (file.size > 5 * 1024 * 1024) return json({ error: "图片不能超过5MB" }, 400, request, env);
    const allowed = ["image/png","image/jpeg","image/webp"];
    if (!allowed.includes(file.type)) return json({ error: "只支持 PNG/JPG/WEBP" }, 400, request, env);
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const key = "payments/" + slot.replace(/[^a-zA-Z0-9_-]/g, "_") + "-" + crypto.randomUUID() + "." + ext;
    await env.ASSETS.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" }
    });
    const publicUrl = new URL("/media/" + key, request.url).toString();
    return json({ ok: true, key, url: publicUrl }, 201, request, env);
  }

  return json({ error: "Admin route not found" }, 404, request, env);
}

async function handlePublic(request, env, url) {
  if (url.pathname === "/public/config" && request.method === "GET") {
    return json(await publicConfig(env), 200, request, env);
  }

  if (url.pathname === "/orders/create" && request.method === "POST") {
    const body = await bodyJson(request);
    const productId = String(body.productId || "");
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const queryPassword = String(body.queryPassword || "");
    const quantity = Math.max(1, Math.min(99, Number(body.quantity || 1)));
    if (!productId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || queryPassword.length < 6) {
      return json({ error: "请完整填写邮箱和查单密码" }, 400, request, env);
    }
    const p = await env.DB.prepare("SELECT * FROM products WHERE id=? AND enabled=1").bind(productId).first();
    if (!p) return json({ error: "商品不存在或已下架" }, 404, request, env);
    const stock = Number(p.stock || 0);
    if (stock > 0 && stock < quantity) return json({ error: "库存不足" }, 409, request, env);
    const total = Number(p.price || 0) * quantity;
    const id = "ZH" + Date.now().toString().slice(-10) + Math.random().toString(36).slice(2, 6).toUpperCase();
    const passHash = await sha256Base64Url(queryPassword);
    await env.DB.prepare(
      "INSERT INTO orders(id,product_id,email,phone,query_password_hash,total,quantity,status,payment_status,payment_method,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))"
    ).bind(id,productId,email,phone,passHash,total,quantity,"待付款","待选择支付方式","").run();
    return json({ ok: true, orderId: id, total }, 201, request, env);
  }

  if (url.pathname === "/orders/lookup" && request.method === "POST") {
    const body = await bodyJson(request);
    const key = String(body.key || "").trim();
    const pass = String(body.queryPassword || "");
    if (!key || !pass) return json({ error: "请输入查单信息" }, 400, request, env);
    const passHash = await sha256Base64Url(pass);
    const row = await env.DB.prepare(
      "SELECT o.*, p.name AS product_name FROM orders o LEFT JOIN products p ON p.id=o.product_id WHERE (o.id=? OR o.email=? OR o.phone=?) AND o.query_password_hash=? ORDER BY o.created_at DESC LIMIT 1"
    ).bind(key,key,key,passHash).first();
    if (!row) return json({ error: "订单不存在或查询密码错误" }, 404, request, env);
    return json({
      order: {
        id: row.id,
        productId: row.product_id,
        productName: row.product_name || "",
        status: row.status,
        paymentStatus: row.payment_status,
        paymentMethod: row.payment_method || "",
        total: Number(row.total || 0),
        deliveryContent: row.delivery_content || "",
        createdAt: row.created_at
      }
    }, 200, request, env);
  }

  return json({ error: "API route not found" }, 404, request, env);
}

async function media(request, env, url) {
  if (request.method !== "GET" || !env.ASSETS) return text("Not found", 404, request, env);
  const key = decodeURIComponent(url.pathname.replace(/^\/media\//, ""));
  if (!key || key.includes("..")) return text("Not found", 404, request, env);
  const obj = await env.ASSETS.get(key);
  if (!obj) return text("Not found", 404, request, env);
  const headers = new Headers(cors(request, env));
  obj.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(obj.body, { headers });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request, env) });
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/media/")) return await media(request, env, url);
      if (url.pathname.startsWith("/admin/")) return await handleAdmin(request, env, url);
      return await handlePublic(request, env, url);
    } catch (e) {
      console.error(e);
      return json({ error: "服务器内部错误" }, 500, request, env);
    }
  }
};
