"use client";

import * as React from "react";
import { useState, useId, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Slot } from "@radix-ui/react-slot";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { Eye, EyeOff, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Typewriter ──────────────────────────────────────────────────────────────

export interface TypewriterProps {
  text: string | string[];
  speed?: number;
  cursor?: string;
  loop?: boolean;
  deleteSpeed?: number;
  delay?: number;
  className?: string;
}

export function Typewriter({
  text,
  speed = 100,
  cursor = "|",
  loop = false,
  deleteSpeed = 50,
  delay = 1500,
  className,
}: TypewriterProps) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [textArrayIndex, setTextArrayIndex] = useState(0);

  const textArray = Array.isArray(text) ? text : [text];
  const currentText = textArray[textArrayIndex] || "";

  useEffect(() => {
    if (!currentText) return;
    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (currentIndex < currentText.length) {
            setDisplayText((prev) => prev + currentText[currentIndex]);
            setCurrentIndex((prev) => prev + 1);
          } else if (loop) {
            setTimeout(() => setIsDeleting(true), delay);
          }
        } else {
          if (displayText.length > 0) {
            setDisplayText((prev) => prev.slice(0, -1));
          } else {
            setIsDeleting(false);
            setCurrentIndex(0);
            setTextArrayIndex((prev) => (prev + 1) % textArray.length);
          }
        }
      },
      isDeleting ? deleteSpeed : speed
    );
    return () => clearTimeout(timeout);
  }, [
    currentIndex, isDeleting, currentText, loop,
    speed, deleteSpeed, delay, displayText, text,
  ]);

  return (
    <span className={className}>
      {displayText}
      <span className="animate-pulse">{cursor}</span>
    </span>
  );
}

// ─── Primitive components (self-contained, no external shadcn deps) ───────────

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
));
Label.displayName = "AuthFuseLabel";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:     "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:     "border border-input dark:border-input/50 bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:   "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:       "hover:bg-accent hover:text-accent-foreground",
        link:        "text-primary-foreground/60 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm:      "h-9 rounded-md px-3",
        lg:      "h-12 rounded-md px-6",
        icon:    "h-8 w-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        )}
        {children}
      </Comp>
    );
  }
);
Button.displayName = "AuthFuseButton";

const BaseInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-10 w-full rounded-lg border border-input dark:border-white/10",
      "bg-background px-3 py-3 text-sm text-foreground shadow-sm shadow-black/5",
      "transition-shadow placeholder:text-muted-foreground/70",
      "focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
));
BaseInput.displayName = "AuthFuseInput";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, ...props }, ref) => {
    const id = useId();
    const [show, setShow] = useState(false);
    return (
      <div className="grid w-full items-center gap-2">
        {label && <Label htmlFor={id}>{label}</Label>}
        <div className="relative">
          <BaseInput
            id={id}
            type={show ? "text" : "password"}
            className={cn("pe-10", className)}
            ref={ref}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute inset-y-0 end-0 flex h-full w-10 items-center justify-center
                       text-muted-foreground/80 transition-colors hover:text-foreground
                       focus-visible:text-foreground focus-visible:outline-none
                       disabled:pointer-events-none disabled:opacity-50"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show
              ? <EyeOff className="size-4" aria-hidden />
              : <Eye   className="size-4" aria-hidden />}
          </button>
        </div>
      </div>
    );
  }
);
PasswordInput.displayName = "AuthFusePasswordInput";

// ─── Shared error / info banners ─────────────────────────────────────────────

function ErrorBanner({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="rounded-lg bg-destructive/10 border border-destructive/30
                    px-3 py-2.5 text-sm text-destructive">
      {msg}
    </div>
  );
}

function InfoBanner({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30
                    px-3 py-2.5 text-sm text-emerald-400">
      {msg}
    </div>
  );
}

// ─── Check-email success screen ───────────────────────────────────────────────

function CheckEmailScreen({
  email,
  onBackToLogin,
}: {
  email: string;
  onBackToLogin: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [msg, setMsg]         = useState("");
  const [err, setErr]         = useState("");

  async function resend() {
    setSending(true); setMsg(""); setErr("");
    try {
      const res  = await fetch("/api/auth/resend-activation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) setErr(data.error || "Дахин илгээхэд алдаа гарлаа");
      else         setMsg(data.message || "Имэйл дахин илгээгдлээ");
    } catch {
      setErr("Серверт холбогдоход алдаа гарлаа");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto grid w-[350px] gap-6">
      {/* Icon */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full
                        bg-brand-600/20 border border-brand-600/40">
          <Mail className="h-7 w-7 text-brand-400" />
        </div>
        <h1 className="text-2xl font-bold">Имэйлээ шалгана уу</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Баталгаажуулах холбоос илгээгдлээ:
        </p>
        <p className="text-sm font-semibold text-brand-400 break-all">{email}</p>
      </div>

      {/* Steps */}
      <div className="rounded-lg border border-border bg-accent/40 p-4 space-y-3">
        {[
          { n: 1, t: (<>Имэйлээс <strong className="text-foreground">1stCS VPN</strong>-аас ирсэн мессежийг нээнэ үү</>) },
          { n: 2, t: (<><strong className="text-foreground">«Имэйл баталгаажуулах»</strong> товч дарна уу</>) },
          { n: 3, t: "Баталгаажсны дараа автоматаар нэвтэрнэ" },
        ].map(({ n, t }) => (
          <div key={n} className="flex gap-3 items-start">
            <span className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center
                             text-white text-xs font-bold shrink-0 mt-0.5">
              {n}
            </span>
            <span className="text-sm text-muted-foreground">{t}</span>
          </div>
        ))}
      </div>

      <ErrorBanner msg={err} />
      <InfoBanner  msg={msg} />

      <Button
        variant="outline"
        onClick={resend}
        loading={sending}
        className="w-full gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Имэйл ирээгүй бол дахин илгээх
      </Button>

      <div className="text-center text-sm">
        <Button variant="link" className="text-muted-foreground pl-0" onClick={onBackToLogin}>
          ← Нэвтрэх хуудас руу буцах
        </Button>
      </div>
    </div>
  );
}

// ─── Sign-In form ─────────────────────────────────────────────────────────────

interface SignInFormProps {
  onSuccess:         () => void;
  onNeedActivation:  (email: string) => void;
  redirectTo:        string;
}

function SignInForm({ onSuccess, onNeedActivation, redirectTo }: SignInFormProps) {
  const router = useRouter();

  const [email, setEmail]     = useState("");
  const [pw, setPw]           = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // unverified sub-state
  const [uvEmail,   setUvEmail]   = useState("");
  const [uvSending, setUvSending] = useState(false);
  const [uvMsg,     setUvMsg]     = useState("");
  const [uvErr,     setUvErr]     = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setUvEmail(""); setUvMsg(""); setUvErr("");
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pw }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === "EMAIL_NOT_VERIFIED") {
          setUvEmail(data.email || email);
          return;
        }
        setError(data.error || "Нэвтрэхэд алдаа гарлаа");
        return;
      }

      localStorage.setItem("vpn_token", data.token);
      localStorage.setItem("vpn_user", JSON.stringify(data.user));
      if (data.token) localStorage.setItem('vpn_token', data.token)
      router.push(redirectTo);
    } catch {
      setError("Серверт холбогдоход алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setUvSending(true); setUvMsg(""); setUvErr("");
    try {
      const res  = await fetch("/api/auth/resend-activation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: uvEmail }),
      });
      const data = await res.json();
      if (!res.ok) setUvErr(data.error || "Дахин илгээхэд алдаа гарлаа");
      else         setUvMsg(data.message || "Имэйл дахин илгээгдлээ");
    } catch {
      setUvErr("Серверт холбогдоход алдаа гарлаа");
    } finally {
      setUvSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} method="post" autoComplete="on" className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center
                          text-white font-bold text-sm">
            V
          </div>
          <span className="font-bold text-base text-foreground">1stCS VPN</span>
        </div>
        <h1 className="text-2xl font-bold">Нэвтрэх</h1>
        <p className="text-sm text-muted-foreground">Таны бүртгэлд нэвтрэнэ</p>
      </div>

      <div className="grid gap-4">
        <ErrorBanner msg={error} />

        {/* Unverified email banner */}
        {uvEmail && (
          <div className="rounded-lg border border-yellow-600/40 bg-yellow-500/10 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-300 text-xs font-semibold mb-0.5">
                  Имэйл баталгаажаагүй байна
                </p>
                <p className="text-yellow-300/70 text-xs">
                  <span className="font-medium">{uvEmail}</span> хаяг руу илгээсэн
                  холбоосыг дарна уу.
                </p>
              </div>
            </div>
            {uvMsg && <p className="text-emerald-400 text-xs">✓ {uvMsg}</p>}
            {uvErr && <p className="text-destructive  text-xs">{uvErr}</p>}
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={uvSending}
              onClick={handleResend}
              className="w-full text-xs h-8 border-yellow-600/40 text-yellow-300
                         hover:bg-yellow-500/10"
            >
              <RefreshCw className="h-3 w-3" />
              Баталгаажуулах имэйл дахин илгээх
            </Button>
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="signin-email">Имэйл хаяг</Label>
          <BaseInput
            id="signin-email"
            name="email"
            type="email"
            placeholder="name@example.com"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <PasswordInput
          name="password"
          label="Нууц үг"
          required
          autoComplete="current-password"
          placeholder="Нууц үгээ оруулна уу"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />

        <Button type="submit" loading={loading} className="mt-1 w-full">
          {!loading && "Нэвтрэх"}
        </Button>
      </div>
    </form>
  );
}

// ─── Sign-Up form ─────────────────────────────────────────────────────────────

interface SignUpFormProps {
  onSuccess: (email: string) => void;
}

function SignUpForm({ onSuccess }: SignUpFormProps) {
  const [email,   setEmail]   = useState("");
  const [pw,      setPw]      = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (pw !== confirm) {
      setError("Нууц үг таарахгүй байна");
      return;
    }
    if (pw.length < 8) {
      setError("Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой");
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pw }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Бүртгүүлэхэд алдаа гарлаа");
        return;
      }

      // Show check-email screen
      onSuccess(email.toLowerCase());
    } catch {
      setError("Серверт холбогдоход алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} method="post" autoComplete="on" className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center
                          text-white font-bold text-sm">
            V
          </div>
          <span className="font-bold text-base text-foreground">1stCS VPN</span>
        </div>
        <h1 className="text-2xl font-bold">Бүртгүүлэх</h1>
        <p className="text-sm text-muted-foreground">Шинэ бүртгэл үүсгэнэ</p>
      </div>

      <div className="grid gap-4">
        <ErrorBanner msg={error} />

        <div className="grid gap-2">
          <Label htmlFor="signup-email">Имэйл хаяг</Label>
          <BaseInput
            id="signup-email"
            name="email"
            type="email"
            placeholder="name@example.com"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <PasswordInput
          name="password"
          label="Нууц үг (8+ тэмдэгт)"
          required
          autoComplete="new-password"
          placeholder="Нууц үгээ оруулна уу"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />

        <PasswordInput
          name="confirmPassword"
          label="Нууц үг давтах"
          required
          autoComplete="new-password"
          placeholder="Нууц үгийг дахин оруулна уу"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <Button type="submit" loading={loading} className="mt-1 w-full">
          {!loading && "Бүртгүүлэх"}
        </Button>
      </div>
    </form>
  );
}

// ─── Auth form container (orchestrates state between forms) ───────────────────

type ContainerMode = "signin" | "signup" | "check-email";

function AuthFormContainer({
  defaultIsSignIn,
  redirectTo,
}: {
  defaultIsSignIn: boolean;
  redirectTo: string;
}) {
  const [mode, setMode] = useState<ContainerMode>(
    defaultIsSignIn ? "signin" : "signup"
  );
  const [registeredEmail, setRegisteredEmail] = useState("");

  const isSignIn = mode === "signin";

  function handleRegistered(email: string) {
    setRegisteredEmail(email);
    setMode("check-email");
  }

  function handleBackToLogin() {
    setMode("signin");
    setRegisteredEmail("");
  }

  return (
    <div className="mx-auto grid w-[350px] gap-4">
      {/* ── Check email ────────────────────────────────────────────── */}
      {mode === "check-email" && (
        <CheckEmailScreen
          email={registeredEmail}
          onBackToLogin={handleBackToLogin}
        />
      )}

      {/* ── Sign-in ────────────────────────────────────────────────── */}
      {mode === "signin" && (
        <>
          <SignInForm
            onSuccess={() => {}}
            onNeedActivation={() => {}}
            redirectTo={redirectTo}
          />
          <div className="text-center text-sm">
            Бүртгэл байхгүй юу?{" "}
            <Button
              variant="link"
              className="pl-1 text-foreground"
              onClick={() => setMode("signup")}
            >
              Бүртгүүлэх
            </Button>
          </div>
        </>
      )}

      {/* ── Sign-up ────────────────────────────────────────────────── */}
      {mode === "signup" && (
        <>
          <SignUpForm onSuccess={handleRegistered} />
          <div className="text-center text-sm">
            Бүртгэл байгаа юу?{" "}
            <Button
              variant="link"
              className="pl-1 text-foreground"
              onClick={() => setMode("signin")}
            >
              Нэвтрэх
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Side panel content config ────────────────────────────────────────────────

interface PanelContent {
  image: { src: string; alt: string };
  quote: { text: string; author: string };
}

const SIGN_IN_PANEL: PanelContent = {
  image: {
    src: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=900&auto=format&fit=crop&q=80",
    alt: "Cybersecurity digital protection",
  },
  quote: {
    text: "Таны интернет холболт бидний хамгаалалтад байна.",
    author: "1stCS VPN",
  },
};

const SIGN_UP_PANEL: PanelContent = {
  image: {
    src: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&auto=format&fit=crop&q=80",
    alt: "Secure server network",
  },
  quote: {
    text: "Хурдан, найдвартай, нууцлалтай. WireGuard технологи дээр суурилсан.",
    author: "1stCS VPN",
  },
};

// ─── Main export ──────────────────────────────────────────────────────────────

export interface AuthUIProps {
  defaultIsSignIn?: boolean;
  /** Pre-computed redirect target — pass from the server page component */
  redirectTo?: string;
}

export function AuthUI({ defaultIsSignIn = true, redirectTo = "/dashboard" }: AuthUIProps) {
  // Track current mode in parent for panel content swap
  const [isSignIn, setIsSignIn] = useState(defaultIsSignIn);
  const panel = isSignIn ? SIGN_IN_PANEL : SIGN_UP_PANEL;

  return (
    <div className="w-full min-h-screen md:grid md:grid-cols-2">
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear { display: none; }
      `}</style>

      {/* ── Left: form ───────────────────────────────────────────────── */}
      <div className="flex min-h-screen items-center justify-center p-6 md:min-h-0 md:p-0 md:py-12">
        {/* We pass a key so the container resets when switching sign-in / sign-up
            via the URL (e.g., /login vs /register) */}
        <_InnerContainer
          defaultIsSignIn={defaultIsSignIn}
          redirectTo={redirectTo}
          onModeChange={setIsSignIn}
        />
      </div>

      {/* ── Right: image + quote ─────────────────────────────────────── */}
      <div
        key={panel.image.src}
        className="hidden md:block relative bg-cover bg-center transition-all duration-700 ease-in-out"
        style={{ backgroundImage: `url(${panel.image.src})` }}
        aria-label={panel.image.alt}
      >
        {/* bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-40
                        bg-gradient-to-t from-background to-transparent" />
        {/* top fade */}
        <div className="absolute inset-x-0 top-0 h-24
                        bg-gradient-to-b from-background/60 to-transparent" />

        {/* VPN shield badge — top-left */}
        <div className="absolute top-6 left-6 flex items-center gap-2
                        bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5
                        border border-border">
          <ShieldCheck className="w-4 h-4 text-brand-400" />
          <span className="text-xs font-semibold text-foreground">
            WireGuard VPN
          </span>
        </div>

        {/* Quote — bottom */}
        <div className="relative z-10 flex h-full flex-col items-center
                        justify-end p-4 pb-8">
          <blockquote className="space-y-1.5 text-center text-foreground max-w-xs">
            <p className="text-lg font-medium drop-shadow-md">
              "
              <Typewriter
                key={panel.quote.text}
                text={panel.quote.text}
                speed={55}
              />
              "
            </p>
            <cite className="block text-sm font-light text-muted-foreground not-italic">
              — {panel.quote.author}
            </cite>
          </blockquote>
        </div>
      </div>
    </div>
  );
}

// Inner container — notifies parent when mode changes so the panel updates
function _InnerContainer({
  defaultIsSignIn,
  redirectTo,
  onModeChange,
}: {
  defaultIsSignIn: boolean;
  redirectTo: string;
  onModeChange: (isSignIn: boolean) => void;
}) {
  type ContainerMode = "signin" | "signup" | "check-email";
  const [mode, setMode]             = useState<ContainerMode>(
    defaultIsSignIn ? "signin" : "signup"
  );
  const [registeredEmail, setReg]   = useState("");

  const switchMode = useCallback(
    (next: ContainerMode) => {
      setMode(next);
      onModeChange(next === "signin");
    },
    [onModeChange]
  );

  return (
    <div className="mx-auto grid w-[350px] gap-4">
      {mode === "check-email" && (
        <CheckEmailScreen
          email={registeredEmail}
          onBackToLogin={() => switchMode("signin")}
        />
      )}

      {mode === "signin" && (
        <>
          <SignInForm
            onSuccess={() => {}}
            onNeedActivation={() => {}}
            redirectTo={redirectTo}
          />
          <div className="text-center text-sm text-muted-foreground">
            Бүртгэл байхгүй юу?{" "}
            <Button
              variant="link"
              className="pl-1 text-foreground p-0 h-auto"
              onClick={() => switchMode("signup")}
            >
              Бүртгүүлэх
            </Button>
          </div>
        </>
      )}

      {mode === "signup" && (
        <>
          <SignUpForm
            onSuccess={(email) => {
              setReg(email);
              switchMode("check-email");
            }}
          />
          <div className="text-center text-sm text-muted-foreground">
            Бүртгэл байгаа юу?{" "}
            <Button
              variant="link"
              className="pl-1 text-foreground p-0 h-auto"
              onClick={() => switchMode("signin")}
            >
              Нэвтрэх
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
