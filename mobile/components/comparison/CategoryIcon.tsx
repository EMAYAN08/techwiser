import React from "react";
import {
  Smartphone, Tablet, Laptop, Watch, Headphones, Tv, Refrigerator, AirVent, Monitor, Keyboard,
  Cpu, Battery, Camera, Ruler, Microchip, Volume2, Wifi, Star, Box,
  Cable, Fingerprint, AppWindow, Palette, ShieldCheck, Tag, Calendar, Gamepad2, Mouse,
  Printer, Router, WashingMachine, Microwave, Speaker, Plug, Power, HardDrive, Disc, Activity,
  Fan, Plane, Thermometer, Zap, Layers, Server, Type, Shuffle
} from "lucide-react-native";

type IconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

export function getCategoryIcon(category: string): IconComponent {
  const c = category.toLowerCase();

  // Core devices
  if (c.includes("phone") || c.includes("smartphone") || c.includes("mobile")) return Smartphone;
  if (c.includes("tablet") || c.includes("ipad")) return Tablet;
  if (c.includes("laptop") || c.includes("macbook") || c.includes("notebook")) return Laptop;
  if (c.includes("desktop") || c.includes("pc") || c.includes("computer")) return Monitor;
  if (c.includes("watch") || c.includes("smartwatch") || c.includes("wearable")) return Watch;
  if (c.includes("headphone") || c.includes("earphone") || c.includes("earbud") || c.includes("buds") || c.includes("audio")) return Headphones;
  if (c.includes("tv") || c.includes("television")) return Tv;
  if (c.includes("display") || c.includes("screen") || c.includes("panel") || c.includes("monitor")) return Monitor;
  if (c.includes("keyboard") || c.includes("typing")) return Keyboard;
  if (c.includes("mouse") || c.includes("trackpad") || c.includes("pointing")) return Mouse;
  if (c.includes("printer") || c.includes("scanner")) return Printer;
  
  // Gaming
  if (c.includes("game") || c.includes("gaming") || c.includes("console") || c.includes("playstation") || c.includes("xbox") || c.includes("nintendo")) return Gamepad2;
  
  // Smart Home & Appliances
  if (c.includes("fridge") || c.includes("refrigerator")) return Refrigerator;
  if (c.includes("ac ") || c.includes("air") || c.includes("conditioning") || c.includes("hvac") || c.includes("purifier") || c.includes("vent")) return AirVent;
  if (c.includes("vacuum") || c.includes("cleaner") || c.includes("roomba")) return Fan;
  if (c.includes("washer") || c.includes("washing") || c.includes("dryer") || c.includes("laundry")) return WashingMachine;
  if (c.includes("microwave") || c.includes("oven") || c.includes("stove")) return Microwave;
  if (c.includes("thermostat") || c.includes("temperature")) return Thermometer;
  if (c.includes("smart home") || c.includes("homekit")) return Router;
  if (c.includes("drone") || c.includes("quadcopter") || c.includes("flight")) return Plane;

  // Components & Specs
  if (c.includes("performance") || c.includes("processor") || c.includes("cpu") || c.includes("speed") || c.includes("chip") || c.includes("soc")) return Cpu;
  if (c.includes("battery") || c.includes("power") || c.includes("charging") || c.includes("charger") || c.includes("endurance")) return Battery;
  if (c.includes("camera") || c.includes("photo") || c.includes("video") || c.includes("lens") || c.includes("optics")) return Camera;
  if (c.includes("design") || c.includes("build") || c.includes("size") || c.includes("dimension") || c.includes("weight") || c.includes("chassis")) return Ruler;
  if (c.includes("memory") || c.includes("ram") || c.includes("storage") || c.includes("ssd") || c.includes("hdd")) return HardDrive;
  if (c.includes("sound") || c.includes("speaker") || c.includes("acoustic") || c.includes("microphone")) return Speaker;
  
  // Connectivity
  if (c.includes("network") || c.includes("connectivity") || c.includes("cellular") || c.includes("wifi") || c.includes("5g") || c.includes("lte") || c.includes("wireless")) return Wifi;
  if (c.includes("connect") || c.includes("port") || c.includes("usb") || c.includes("thunderbolt") || c.includes("hdmi")) return Cable;
  if (c.includes("router") || c.includes("modem") || c.includes("mesh")) return Router;
  if (c.includes("cable") || c.includes("wire") || c.includes("cord") || c.includes("adapter")) return Plug;
  
  // Software & Features
  if (c.includes("sensor") || c.includes("biometric") || c.includes("face") || c.includes("fingerprint") || c.includes("security")) return Fingerprint;
  if (c.includes("software") || c.includes("os") || c.includes("operating") || c.includes("system") || c.includes("ui") || c.includes("app")) return AppWindow;
  if (c.includes("color") || c.includes("finish") || c.includes("hue")) return Palette;
  if (c.includes("warranty") || c.includes("support") || c.includes("care") || c.includes("protection")) return ShieldCheck;
  if (c.includes("price") || c.includes("value") || c.includes("cost") || c.includes("budget")) return Tag;
  if (c.includes("release") || c.includes("launch") || c.includes("date") || c.includes("year")) return Calendar;
  if (c.includes("overview") || c.includes("summary") || c.includes("general")) return Activity;
  if (c.includes("server") || c.includes("nas") || c.includes("host")) return Server;
  if (c.includes("alternative")) return Shuffle;
  if (c.includes("other") || c.includes("misc") || c.includes("feature") || c.includes("additional")) return Layers;

  return Box;
}
