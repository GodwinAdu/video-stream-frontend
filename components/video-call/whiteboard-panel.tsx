"use client"

import { useState, useRef, useEffect } from "react"
import { X, Pencil, Eraser, Square, Circle, Type, Undo, Redo, Trash2, Download, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

interface WhiteboardPanelProps {
    onClose: () => void
    signalingRef: any
    localParticipantId: string | null
}

type Tool = "pen" | "eraser" | "rectangle" | "circle" | "text"

interface DrawAction {
    tool: Tool
    color: string
    width: number
    points: { x: number; y: number }[]
    text?: string
}

export default function WhiteboardPanel({ onClose, signalingRef, localParticipantId }: WhiteboardPanelProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [tool, setTool] = useState<Tool>("pen")
    const [color, setColor] = useState("#3B82F6")
    const [lineWidth, setLineWidth] = useState(3)
    const [history, setHistory] = useState<DrawAction[]>([])
    const [historyStep, setHistoryStep] = useState(0)

    const colors = ["#000000", "#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#FFFFFF"]

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        // Set canvas size
        canvas.width = canvas.offsetWidth
        canvas.height = canvas.offsetHeight

        // Set white background
        ctx.fillStyle = "#FFFFFF"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
    }, [])

    useEffect(() => {
        if (!signalingRef.current) return

        const socket = signalingRef.current

        socket.on("whiteboard-draw", ({ action }: { action: DrawAction }) => {
            drawAction(action)
        })

        socket.on("whiteboard-clear", () => {
            clearCanvas()
        })

        return () => {
            socket.off("whiteboard-draw")
            socket.off("whiteboard-clear")
        }
    }, [signalingRef])

    const drawAction = (action: DrawAction) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        ctx.strokeStyle = action.color
        ctx.lineWidth = action.width
        ctx.lineCap = "round"
        ctx.lineJoin = "round"

        if (action.tool === "pen" || action.tool === "eraser") {
            if (action.tool === "eraser") {
                ctx.globalCompositeOperation = "destination-out"
            } else {
                ctx.globalCompositeOperation = "source-over"
            }

            ctx.beginPath()
            action.points.forEach((point, index) => {
                if (index === 0) {
                    ctx.moveTo(point.x, point.y)
                } else {
                    ctx.lineTo(point.x, point.y)
                }
            })
            ctx.stroke()
        } else if (action.tool === "rectangle" && action.points.length === 2) {
            const [start, end] = action.points
            ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y)
        } else if (action.tool === "circle" && action.points.length === 2) {
            const [start, end] = action.points
            const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))
            ctx.beginPath()
            ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI)
            ctx.stroke()
        }
    }

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDrawing(true)
        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const action: DrawAction = {
            tool,
            color,
            width: lineWidth,
            points: [{ x, y }],
        }

        setHistory(prev => [...prev.slice(0, historyStep), action])
        setHistoryStep(prev => prev + 1)
    }

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return

        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const currentAction = history[historyStep - 1]
        if (!currentAction) return

        currentAction.points.push({ x, y })

        drawAction(currentAction)

        // Broadcast to others
        if (signalingRef.current) {
            signalingRef.current.emit("whiteboard-draw", { action: currentAction })
        }
    }

    const stopDrawing = () => {
        setIsDrawing(false)
    }

    const undo = () => {
        if (historyStep > 0) {
            setHistoryStep(prev => prev - 1)
            redrawCanvas(historyStep - 1)
        }
    }

    const redo = () => {
        if (historyStep < history.length) {
            setHistoryStep(prev => prev + 1)
            redrawCanvas(historyStep + 1)
        }
    }

    const redrawCanvas = (step: number) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        // Clear and redraw
        ctx.fillStyle = "#FFFFFF"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        history.slice(0, step).forEach(action => {
            drawAction(action)
        })
    }

    const clearCanvas = () => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        ctx.fillStyle = "#FFFFFF"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        setHistory([])
        setHistoryStep(0)

        if (signalingRef.current) {
            signalingRef.current.emit("whiteboard-clear")
        }
    }

    const downloadCanvas = () => {
        const canvas = canvasRef.current
        if (!canvas) return

        const url = canvas.toDataURL("image/png")
        const link = document.createElement("a")
        link.download = `whiteboard-${Date.now()}.png`
        link.href = url
        link.click()
    }

    return (
        <div className="h-full flex flex-col bg-slate-900 text-slate-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <div className="flex items-center space-x-2">
                    <Pencil className="w-5 h-5 text-blue-400" />
                    <h2 className="text-lg font-semibold">Whiteboard</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="w-5 h-5" />
                </Button>
            </div>

            {/* Toolbar */}
            <div className="p-4 border-b border-slate-700 space-y-4">
                {/* Tools */}
                <div className="flex items-center space-x-2">
                    <Button
                        variant={tool === "pen" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTool("pen")}
                    >
                        <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={tool === "eraser" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTool("eraser")}
                    >
                        <Eraser className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={tool === "rectangle" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTool("rectangle")}
                    >
                        <Square className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={tool === "circle" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTool("circle")}
                    >
                        <Circle className="w-4 h-4" />
                    </Button>

                    <Separator orientation="vertical" className="h-8" />

                    <Button variant="outline" size="sm" onClick={undo} disabled={historyStep === 0}>
                        <Undo className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={redo} disabled={historyStep === history.length}>
                        <Redo className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearCanvas}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadCanvas}>
                        <Download className="w-4 h-4" />
                    </Button>
                </div>

                {/* Colors */}
                <div className="flex items-center space-x-2">
                    <Palette className="w-4 h-4 text-slate-400" />
                    {colors.map(c => (
                        <button
                            key={c}
                            onClick={() => setColor(c)}
                            className={`w-8 h-8 rounded-full border-2 ${
                                color === c ? "border-blue-400 scale-110" : "border-slate-600"
                            } transition-transform`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>

                {/* Line Width */}
                <div className="space-y-2">
                    <Label className="text-sm">Brush Size: {lineWidth}px</Label>
                    <Slider
                        value={[lineWidth]}
                        onValueChange={([value]) => setLineWidth(value)}
                        min={1}
                        max={20}
                        step={1}
                        className="w-full"
                    />
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 p-4 overflow-hidden">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="w-full h-full bg-white rounded-lg cursor-crosshair shadow-lg"
                />
            </div>
        </div>
    )
}
