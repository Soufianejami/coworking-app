import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { supabase } from "./supabase";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(stored: string, supplied: string) {
  const [hash, salt] = stored.split(".");
  const hashBuf = Buffer.from(hash, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "default_secret",
      resave: false,
      saveUninitialized: false,
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', username)
          .single();

        if (error || !user) {
          return done(null, false);
        }

        const valid = await comparePasswords(user.password, password);
        if (!valid) {
          return done(null, false);
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return done(error);
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
}

export const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  next();
};

export const requireSuperAdmin = (req: any, res: any, next: any) => {
  if (!req.user || req.user.role !== "super_admin") {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  next();
};

export const requireAdminOrSuperAdmin = (req: any, res: any, next: any) => {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "super_admin")) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  next();
};