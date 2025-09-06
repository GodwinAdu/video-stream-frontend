"use client"

interface ReactionOverlayProps {
    emoji: string
}

export default function ReactionOverlay({ emoji }: ReactionOverlayProps) {
    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl z-10 pointer-events-none">
            {emoji}
        </div>
    )
}
