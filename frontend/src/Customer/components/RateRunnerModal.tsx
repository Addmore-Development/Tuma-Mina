import { useState } from "react";
import Button from "../../components/Button";
import { IconClose, IconStar } from "../icons";

interface RateRunnerModalProps {
  runnerName: string;
  onSubmit: (stars: number, comment: string) => void;
  onClose: () => void;
}

export default function RateRunnerModal({ runnerName, onSubmit, onClose }: RateRunnerModalProps) {
  const [stars, setStars] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");

  return (
    <div className="fixed inset-0 bg-indigo-950/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-[420px] shadow-lg2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-[19px]">Rate {runnerName}</h3>
          <button onClick={onClose} className="text-ink-soft hover:text-ink"><IconClose className="w-5 h-5" /></button>
        </div>
        <p className="text-[13.5px] text-ink-soft mb-5">How was your experience with this task?</p>

        <div className="flex gap-1.5 mb-5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setStars(n)}
              className="text-coral"
            >
              <IconStar className="w-7 h-7" filled={n <= (hovered || stars)} />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Anything worth mentioning? (optional)"
          className="w-full px-[15px] py-3 border-[1.5px] border-line rounded-xl text-[14px] focus:outline-none focus:border-indigo-500 resize-none mb-5"
        />

        <div className="flex gap-3">
          <Button
            variant="primary"
            block
            disabled={stars === 0}
            className={stars === 0 ? "opacity-50 pointer-events-none" : ""}
            onClick={() => {
              // TODO: POST /api/tasks/:id/rating
              onSubmit(stars, comment.trim());
            }}
          >
            Submit rating
          </Button>
        </div>
      </div>
    </div>
  );
}
