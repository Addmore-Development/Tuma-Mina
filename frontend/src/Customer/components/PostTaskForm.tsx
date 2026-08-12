import { useState, type FormEvent } from "react";
import Button from "../../components/Button";
import type { CustomerTask, DeliveryMode, JobType } from "../../types/types";
import { categoryIcons } from "../categoryIcons";
import { IconPin } from "../icons";

const categories: JobType[] = ["Delivery", "Document", "Queuing", "Shopping", "Errand"];

interface PostTaskFormProps {
  onCreate: (task: CustomerTask) => void;
  onCancel: () => void;
}

export default function PostTaskForm({ onCreate, onCancel }: PostTaskFormProps) {
  const [category, setCategory] = useState<JobType>("Delivery");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("location");
  const [location, setLocation] = useState("");
  const [deadline, setDeadline] = useState("");
  const [pricingMode, setPricingMode] = useState<"budget" | "quote">("budget");
  const [budget, setBudget] = useState("");
  const [photoName, setPhotoName] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !location.trim() || !deadline) return;

    // TODO: POST /api/tasks with { category, title, description, deliveryMode, location,
    // deadline, budget }. The backend fans this out to nearby runners, who then submit
    // quotes (or accept the budget outright) — those come back over the task's quotes list.
    const id = `TM-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTask: CustomerTask = {
      id,
      title: title.trim(),
      category,
      description: description.trim(),
      deliveryMode,
      location: location.trim(),
      deadline,
      budget: pricingMode === "budget" && budget ? Number(budget) : null,
      status: "posted",
      // Seed data standing in for runners who've already responded — remove once
      // live quote submissions come back from the runner app.
      quotes: [
        { id: `${id}-q1`, runnerName: "Thabo M.", runnerRating: 4.8, price: pricingMode === "budget" && budget ? Number(budget) : 95, note: "Can start within the hour." },
        { id: `${id}-q2`, runnerName: "Palesa N.", runnerRating: 4.6, price: pricingMode === "budget" && budget ? Number(budget) - 10 : 85 },
      ],
      pin: deliveryMode === "person" ? String(Math.floor(1000 + Math.random() * 9000)) : undefined,
      createdAt: new Date().toISOString(),
    };
    onCreate(newTask);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-[640px]">
      <h2 className="text-[24px] mb-1.5">Post a task</h2>
      <p className="text-ink-soft text-[14px] mb-7">Describe what you need done — runners nearby will accept your budget or send a quote.</p>

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

      <div className="mb-[18px]">
        <label className="block text-[13px] font-semibold mb-1.5">Task title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Drop this parcel off in Rosebank"
          className="w-full px-[15px] py-3 border-[1.5px] border-line rounded-xl text-[14.5px] focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="mb-[18px]">
        <label className="block text-[13px] font-semibold mb-1.5">Details</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Anything the runner should know — size, fragility, who to hand it to, gate codes..."
          className="w-full px-[15px] py-3 border-[1.5px] border-line rounded-xl text-[14.5px] focus:outline-none focus:border-indigo-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-[18px]">
        <div>
          <label className="block text-[13px] font-semibold mb-1.5">Location</label>
          <div className="relative">
            <IconPin className="w-4 h-4 text-ink-soft absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Suburb or address"
              className="w-full pl-[42px] pr-[15px] py-3 border-[1.5px] border-line rounded-xl text-[14.5px] focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-[13px] font-semibold mb-1.5">Needed by</label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-[15px] py-3 border-[1.5px] border-line rounded-xl text-[14.5px] focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Delivery mode */}
      <div className="mb-[18px]">
        <label className="block text-[13px] font-semibold mb-2.5">How is this handed off?</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
        </div>
      </div>

      {/* Pricing */}
      <div className="mb-[18px]">
        <label className="block text-[13px] font-semibold mb-2.5">Pricing</label>
        <div className="flex bg-lavender-100 p-1 rounded-full mb-3 max-w-[360px]">
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
          <input
            type="number"
            min={0}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="R  amount"
            className="w-full max-w-[220px] px-[15px] py-3 border-[1.5px] border-line rounded-xl text-[14.5px] focus:outline-none focus:border-indigo-500"
          />
        )}
      </div>

      {/* Photo attach — mock, no upload wired up yet */}
      <div className="mb-7">
        <label className="block text-[13px] font-semibold mb-1.5">Reference photo (optional)</label>
        <label className="flex items-center gap-2.5 px-4 py-3 border-[1.5px] border-dashed border-line rounded-xl text-[13.5px] text-ink-soft cursor-pointer hover:border-indigo-400 w-fit">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? "")}
          />
          {photoName || "Attach a photo"}
        </label>
      </div>

      <div className="flex gap-3">
        <Button type="submit" variant="primary" size="lg">Post task</Button>
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
