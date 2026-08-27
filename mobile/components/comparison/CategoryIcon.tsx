import React from "react";
import {
  Smartphone, Tablet, Laptop, Watch, Headphones, Tv, Refrigerator, AirVent, Monitor, Keyboard,
  Cpu, Battery, Camera, Ruler, Microchip, Volume2, Wifi, Star,
  Cable, Fingerprint, AppWindow, Palette, ShieldCheck, Tag, Calendar,
} from "lucide-react-native";

type IconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

export function getCategoryIcon(category: string): IconComponent {
  const c = category.toLowerCase();

  if (c.includes("phone") || c.includes("smartphone")) return Smartphone;
  if (c.includes("tablet") || c.includes("ipad")) return Tablet;
  if (c.includes("laptop") || c.includes("macbook") || c.includes("notebook")) return Laptop;
  if (c.includes("watch") || c.includes("smartwatch")) return Watch;
  if (c.includes("headphone") || c.includes("earphone") || c.includes("earbud") || c.includes("buds")) return Headphones;
  if (c.includes("tv") || c.includes("television")) return Tv;
  if (c.includes("fridge") || c.includes("refrigerator")) return Refrigerator;
  if (c.includes("ac") || c.includes("air") || c.includes("conditioning")) return AirVent;
  if (c.includes("desktop") || c.includes("pc") || c.includes("monitor")) return Monitor;
  if (c.includes("keyboard")) return Keyboard;

  if (c.includes("performance") || c.includes("processor") || c.includes("cpu") || c.includes("speed") || c.includes("chip")) return Cpu;
  if (c.includes("display") || c.includes("screen") || c.includes("panel")) return Monitor;
  if (c.includes("battery") || c.includes("power") || c.includes("charging")) return Battery;
  if (c.includes("camera") || c.includes("photo") || c.includes("video")) return Camera;
  if (c.includes("design") || c.includes("build") || c.includes("size") || c.includes("dimension") || c.includes("weight")) return Ruler;
  if (c.includes("memory") || c.includes("ram") || c.includes("storage")) return Microchip;
  if (c.includes("audio") || c.includes("sound") || c.includes("speaker")) return Volume2;
  if (c.includes("network") || c.includes("connectivity") || c.includes("cellular") || c.includes("wifi")) return Wifi;
  if (c.includes("connect") || c.includes("port") || c.includes("usb")) return Cable;
  if (c.includes("sensor") || c.includes("biometric") || c.includes("face") || c.includes("fingerprint")) return Fingerprint;
  if (c.includes("software") || c.includes("os") || c.includes("operating")) return AppWindow;
  if (c.includes("color") || c.includes("finish")) return Palette;
  if (c.includes("warranty") || c.includes("support")) return ShieldCheck;
  if (c.includes("price") || c.includes("value")) return Tag;
  if (c.includes("release") || c.includes("launch") || c.includes("date")) return Calendar;

  return Star;
}
