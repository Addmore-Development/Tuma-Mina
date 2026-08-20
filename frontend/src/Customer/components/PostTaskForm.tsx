import { useState, type FormEvent, type ReactNode } from "react";
import { useNow } from "../useNow";
import { formatRelativeTime } from "../formatRelativeTime";
import Button from "../../components/Button";
import type { CustomerTask, DeliveryMode, JobType, Quote } from "../../types/types";
import { TOWNS, type TownName } from "../../types/platform";
import { categoryIcons } from "../categoryIcons";
import { IconCamera, IconClose, IconPin } from "../icons";

const categories: JobType[] = ["Delivery", "Document", "Queuing", "Shopping", "Errand"];
const MAX_PHOTOS = 3;

interface SavedLocation {
  label: string;
  address: string;
}

interface PostTaskFormProps {
  mode?: "create" | "edit";
  initialTask?: CustomerTask;
  savedLocations: SavedLocation[];
  onSaveLocation: (location: SavedLocation) => void;
  onSubmit: (task: CustomerTask) => void;
  onCancel: () => void;
}

function toLocalDatetimeInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PostTaskForm({ mode = "create", initialTask, savedLocations, onSaveLocation, onSubmit, onCancel }: PostTaskFormProps) {
  const editing = mode === "edit" && !!initialTask;

  const [category, setCategory] = useState<JobType>(initialTask?.category ?? "Delivery");
  const [title, setTitle] = useState(initialTask?.title ?? "");
  const [description, setDescription] = useState(initialTask?.description ?? "");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(initialTask?.deliveryMode ?? "location");
  const [location, setLocation] = useState(initialTask?.location ?? "");
  const [town, setTown] = useState<TownName | "">(initialTask?.town ?? "");
  const [savingLocation, setSavingLocation] = useState(false);
  const [newLocationLabel, setNewLocationLabel] = useState("");
  const [deadline, setDeadline] = useState(initialTask?.deadline ? toLocalDatetimeInput(initialTask.deadline) : "");
  const [pricingMode, setPricingMode] = useState<"budget" | "quote">(initialTask?.budget ? "budget" : "quote");
  const [budget, setBudget] = useState(initialTask?.budget ? String(initialTask.budget) : "");
  const [photos, setPhotos] = useState<string[]>(initialTask?.referencePhotos ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const now = useNow();

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const room = MAX_PHOTOS - photos.length;
    const next = Array.from(files)
      .slice(0, room)
      .map((f) => URL.createObjectURL(f));
    if (next.length) setPhotos((p) => [...p, ...next]);
  }

  function removePhoto(url: string) {
    setPhotos((p) => p.filter((x) => x !== url));
  }

  function confirmSaveLocation() {
    if (!newLocationLabel.trim() || !location.trim()) return;
    onSaveLocation({ label: newLocationLabel.trim(), address: location.trim() });
    setNewLocationLabel("");
    setSavingLocation(false);
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Give your task a short title.";
    if (!town) next.town = "Choose which city or town this is in.";
    if (!location.trim()) next.location = "Let runners know where this is.";
    if (!deadline) {
      next.deadline = "Choose when you need this done by.";
    } else if (new Date(deadline).getTime() <= now) {
      next.deadline = "Pick a time in the future.";
    }
    if (pricingMode === "budget" && (!budget || Number(budget) <= 0)) {
      next.budget = "Enter a budget greater than R0.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const resolvedBudget = pricingMode === "budget" && budget ? Number(budget) : null;

    if (editing && initialTask) {
      onSubmit({
        ...initialTask,
        title: title.trim(),
        category,
        description: description.trim(),
        deliveryMode,
        location: location.trim(),
        town: town as TownName,
        deadline: new Date(deadline).toISOString(),
        budget: resolvedBudget,
        referencePhotos: photos,
        pin: deliveryMode === "person" ? initialTask.pin ?? String(Math.floor(1000 + Math.random() * 9000)) : undefined,
      });
      return;
    }

    const id = `TM-${Math.floor(1000 + Math.random() * 9000)}`;
    const seedPrice = resolvedBudget ?? 95;
    const quotes: Quote[] = [
      { id: `${id}-q1`, runnerName: "Thabo M.", runnerRating: 4.8, price: seedPrice, note: "Can start within the hour.", status: "open" },
      { id: `${id}-q2`, runnerName: "Palesa N.", runnerRating: 4.6, price: Math.max(seedPrice - 10, 20), status: "open" },
    ];
    onSubmit({
      id,
      title: title.trim(),
      category,
      description: description.trim(),
      deliveryMode,
      location: location.trim(),
      town: town as TownName,
      deadline: new Date(deadline).toISOString(),
      budget: resolvedBudget,
      status: "posted",
      quotes,
      referencePhotos: photos,
      pin: deliveryMode === "person" ? String(Math.floor(1000 + Math.random() * 9000)) : undefined,
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <div className="max-w-[1040px]">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8 items-start">
        <form onSubmit={handleSubmit} noValidate className="min-w-0">
      <h2 className="text-[22px] sm:text-[24px] mb-1.5">{editing ? "Edit task" : "Post a task"}</h2>
      <p className="text-ink-soft text-[13.5px] sm:text-[14px] mb-6 sm:mb-7">
        {editing
          ? "You can update these details until a runner accepts."
          : "Describe what you need done — runners nearby will accept your budget or send a quote."}
      </p>

      {/* Category */}
      <div className="mb-6">
        <label className="block text-[13px] font-semibold mb-2.5">Category</label>
        <div className="flex flex-wrap gap-2.5">
          {categories.map((c) => {
            const Icon = categoryIcons[c];
            const active = category === c;
            return (
              <button
                type="button"
                key={c}
                onClick={() => setCategory(c)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[13.5px] font-medium border-[1.5px] transition ${
                  active ? "bg-indigo-950 border-indigo-950 text-white" : "border-line text-ink-soft hover:border-indigo-500 hover:text-indigo-600"
                }`}
              >
                <Icon className="w-4 h-4" />
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Task title" error={errors.title}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Drop this parcel off in Rosebank"
          className={inputClass(!!errors.title)}
        />
      </Field>

      <Field label="Details">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Anything the runner should know — size, fragility, who to hand it to, gate codes..."
          className={`${inputClass(false)} resize-none`}
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-[18px]">
        <Field label="Town / city" error={errors.town} noMarginBottom>
          <select
            value={town}
            onChange={(e) => setTown(e.target.value as TownName)}
            className={inputClass(!!errors.town)}
          >
            <option value="" disabled>Select a town or city</option>
            {TOWNS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Location" error={errors.location} noMarginBottom>
          <div className="relative">
            <IconPin className="w-4 h-4 text-ink-soft absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Suburb or address"
              className={`${inputClass(!!errors.location)} pl-[42px]`}
            />
          </div>
          {savedLocations.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {savedLocations.map((loc) => (
                <button
                  type="button"
                  key={loc.label}
                  onClick={() => setLocation(loc.address)}
                  className="px-3 py-1 rounded-full border border-line text-[12px] font-medium text-ink-soft hover:border-indigo-400 hover:text-indigo-600"
                >
                  {loc.label}
                </button>
              ))}
            </div>
          )}
          {location.trim() && !savingLocation && !savedLocations.some((l) => l.address === location.trim()) && (
            <button type="button" onClick={() => setSavingLocation(true)} className="text-[12px] text-indigo-600 font-semibold mt-1.5">
              + Save this location
            </button>
          )}
          {savingLocation && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                autoFocus
                value={newLocationLabel}
                onChange={(e) => setNewLocationLabel(e.target.value)}
                placeholder="Label, e.g. Home"
                className="flex-1 px-3 py-2 border-[1.5px] border-line rounded-lg text-[13px] focus:outline-none focus:border-indigo-500"
              />
              <Button type="button" size="md" onClick={confirmSaveLocation}>Save</Button>
              <button type="button" onClick={() => setSavingLocation(false)} className="text-[12.5px] text-ink-soft">Cancel</button>
            </div>
          )}
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-[18px]">
        <Field label="Needed by" error={errors.deadline} noMarginBottom>
          <input
            type="datetime-local"
            value={deadline}
            min={toLocalDatetimeInput(new Date(now + 3_600_000).toISOString())}
            onChange={(e) => setDeadline(e.target.value)}
            className={inputClass(!!errors.deadline)}
          />
        </Field>
      </div>

      {/* Delivery mode */}
      <div className="mb-[18px] mt-[18px]">
        <label className="block text-[13px] font-semibold mb-2.5">How is this handed off?</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setDeliveryMode("location")}
            className={`text-left p-3.5 rounded-xl border-[1.5px] transition ${
              deliveryMode === "location" ? "border-indigo-500 bg-lavender-100" : "border-line hover:border-indigo-300"
            }`}
          >
            <span className="block text-[13.5px] font-semibold mb-1">Drop at a location</span>
            <span className="block text-[12.5px] text-ink-soft">Runner uploads a photo as proof of drop-off.</span>
          </button>
          <button
            type="button"
            onClick={() => setDeliveryMode("person")}
            className={`text-left p-3.5 rounded-xl border-[1.5px] transition ${
              deliveryMode === "person" ? "border-indigo-500 bg-lavender-100" : "border-line hover:border-indigo-300"
            }`}
          >
            <span className="block text-[13.5px] font-semibold mb-1">Hand to a person</span>
            <span className="block text-[12.5px] text-ink-soft">We'll generate a PIN — share it with the receiver to confirm.</span>
          </button>
          <button
            type="button"
            onClick={() => setDeliveryMode("courier")}
            className={`text-left p-3.5 rounded-xl border-[1.5px] transition ${
              deliveryMode === "courier" ? "border-indigo-500 bg-lavender-100" : "border-line hover:border-indigo-300"
            }`}
          >
            <span className="block text-[13.5px] font-semibold mb-1">Courier delivery</span>
            <span className="block text-[12.5px] text-ink-soft">A courier picks up and delivers — no in-person hand-off.</span>
          </button>
        </div>
      </div>

      {/* Pricing */}
      <div className="mb-[18px]">
        <label className="block text-[13px] font-semibold mb-2.5">Pricing</label>
        <div className="flex bg-lavender-100 p-1 rounded-full mb-3 max-w-full sm:max-w-[360px]">
          <button
            type="button"
            onClick={() => setPricingMode("budget")}
            className={`flex-1 py-2 rounded-full text-[13px] font-semibold transition ${
              pricingMode === "budget" ? "bg-white text-indigo-600 shadow-sm2" : "text-ink-soft"
            }`}
          >
            Set a budget
          </button>
          <button
            type="button"
            onClick={() => setPricingMode("quote")}
            className={`flex-1 py-2 rounded-full text-[13px] font-semibold transition ${
              pricingMode === "quote" ? "bg-white text-indigo-600 shadow-sm2" : "text-ink-soft"
            }`}
          >
            Let runners quote
          </button>
        </div>
        {pricingMode === "budget" && (
          <>
            <input
              type="number"
              min={1}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="R  amount"
              className={`w-full max-w-[220px] ${inputClass(!!errors.budget)}`}
            />
            {errors.budget && <p className="text-[12px] text-[#d64545] mt-1">{errors.budget}</p>}
          </>
        )}
      </div>

      {/* Photo attach */}
      <div className="mb-7">
        <label className="block text-[13px] font-semibold mb-1.5">
          Reference photos <span className="font-normal text-ink-soft">(optional, up to {MAX_PHOTOS})</span>
        </label>
        <div className="flex flex-wrap gap-3">
          {photos.map((url) => (
            <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border-[1.5px] border-line flex-shrink-0">
              <img src={url} alt="Reference" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(url)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-indigo-950/70 text-white flex items-center justify-center"
              >
                <IconClose className="w-3 h-3" />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className="w-20 h-20 flex-shrink-0 flex flex-col items-center justify-center gap-1 border-[1.5px] border-dashed border-line rounded-xl text-[11px] text-ink-soft cursor-pointer hover:border-indigo-400">
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
              <span className="text-[20px] leading-none">+</span>
              Add
            </label>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button type="submit" variant="primary" size="lg" block>{editing ? "Save changes" : "Post task"}</Button>
        <Button type="button" variant="ghost" size="lg" block onClick={onCancel}>Cancel</Button>
      </div>
        </form>

        <aside className="lg:sticky lg:top-6">
          <div className="bg-white rounded-2xl border border-line p-5">
            <h3 className="text-[13px] font-semibold mb-4">Task summary</h3>
            <div className="flex flex-col gap-3.5">
              <SummaryRow icon={categoryIcons[category]} label="Category" value={category} />
              <SummaryRow label="Title" value={title.trim() || "Untitled task"} muted={!title.trim()} />
              <SummaryRow icon={IconPin} label="Location" value={location.trim() || "Not set yet"} muted={!location.trim()} />
              <SummaryRow
                label="Needed by"
                value={deadline ? `${new Date(deadline).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} (${formatRelativeTime(new Date(deadline).toISOString(), now)})` : "Not set yet"}
                muted={!deadline}
              />
              <SummaryRow
                label="Hand-off"
                value={
                  deliveryMode === "location"
                    ? "Drop at a location"
                    : deliveryMode === "person"
                    ? "Hand to a person (PIN)"
                    : "Courier delivery"
                }
              />
              <SummaryRow
                label="Pricing"
                value={pricingMode === "budget" ? (budget ? `R${budget} budget` : "Not set yet") : "Open to quotes"}
                muted={pricingMode === "budget" && !budget}
              />
              {photos.length > 0 && <SummaryRow icon={IconCamera} label="Photos" value={`${photos.length} attached`} />}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
  muted = false,
}: {
  icon?: (p: { className?: string }) => ReactNode;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[12.5px] text-ink-soft flex items-center gap-1.5 flex-shrink-0">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </span>
      <span className={`text-[13px] font-medium text-right ${muted ? "text-ink-soft italic" : ""}`}>{value}</span>
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full px-[15px] py-3 border-[1.5px] rounded-xl text-[14.5px] focus:outline-none focus:border-indigo-500 ${
    hasError ? "border-[#d64545]" : "border-line"
  }`;
}

function Field({
  label,
  error,
  noMarginBottom = false,
  children,
}: {
  label: string;
  error?: string;
  noMarginBottom?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={noMarginBottom ? "" : "mb-[18px]"}>
      <label className="block text-[13px] font-semibold mb-1.5">{label}</label>
      {children}
      {error && <p className="text-[12px] text-[#d64545] mt-1">{error}</p>}
    </div>
  );
}