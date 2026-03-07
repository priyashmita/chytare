import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FOCAL_PRESETS = [
  { value: "top center", label: "Top Center (faces)" },
  { value: "center center", label: "Center" },
  { value: "bottom center", label: "Bottom Center" },
  { value: "left center", label: "Left" },
  { value: "right center", label: "Right" },
  { value: "top left", label: "Top Left" },
  { value: "top right", label: "Top Right" },
  { value: "custom", label: "Custom X/Y" },
];

const FocalPointControl = ({ value, onChange, imageUrl, testId }) => {
  const isCustom = value && value.includes("%");
  const [mode, setMode] = useState(isCustom ? "custom" : "preset");
  const [customX, setCustomX] = useState(50);
  const [customY, setCustomY] = useState(30);

  useEffect(() => {
    if (isCustom) {
      const parts = value.split(" ");
      setCustomX(parseInt(parts[0]) || 50);
      setCustomY(parseInt(parts[1]) || 30);
    }
  }, []);

  const handlePresetChange = (v) => {
    if (v === "custom") {
      setMode("custom");
      onChange(`${customX}% ${customY}%`);
    } else {
      setMode("preset");
      onChange(v);
    }
  };

  const handleCustomChange = (x, y) => {
    setCustomX(x);
    setCustomY(y);
    onChange(`${x}% ${y}%`);
  };

  const displayValue = mode === "custom" ? `${customX}% ${customY}%` : (value || "top center");

  return (
    <div data-testid={testId} className="space-y-3">
      <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Focal Point</Label>

      {/* Preview with focal indicator */}
      {imageUrl && (
        <div className="relative aspect-video max-w-[200px] bg-[#1B4D3E]/5 border border-[#DACBA0]/20 overflow-hidden">
          <img src={imageUrl} alt="Focal preview" className="w-full h-full object-cover" style={{ objectPosition: displayValue }} />
        </div>
      )}

      <Select
        value={mode === "custom" ? "custom" : (value || "top center")}
        onValueChange={handlePresetChange}
      >
        <SelectTrigger className="text-sm" data-testid={`${testId}-select`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FOCAL_PRESETS.map((fp) => (
            <SelectItem key={fp.value} value={fp.value}>{fp.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {mode === "custom" && (
        <div className="space-y-2 p-3 bg-[#1B4D3E]/5 border border-[#DACBA0]/20">
          <div>
            <Label className="text-xs text-[#1B4D3E]/60">Horizontal: {customX}%</Label>
            <Slider value={[customX]} onValueChange={([v]) => handleCustomChange(v, customY)} min={0} max={100} step={5} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-[#1B4D3E]/60">Vertical: {customY}%</Label>
            <Slider value={[customY]} onValueChange={([v]) => handleCustomChange(customX, v)} min={0} max={100} step={5} className="mt-1" />
          </div>
        </div>
      )}
    </div>
  );
};

export default FocalPointControl;
