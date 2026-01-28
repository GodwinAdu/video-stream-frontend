import { useState, useEffect, useRef } from "react"

export function usePictureInPicture(videoElement: HTMLVideoElement | null) {
    const [isPiPActive, setIsPiPActive] = useState(false)
    const [isPiPSupported, setIsPiPSupported] = useState(false)

    useEffect(() => {
        // Check if PiP is supported
        setIsPiPSupported(document.pictureInPictureEnabled)

        // Listen for PiP events
        const handleEnterPiP = () => setIsPiPActive(true)
        const handleLeavePiP = () => setIsPiPActive(false)

        if (videoElement) {
            videoElement.addEventListener("enterpictureinpicture", handleEnterPiP)
            videoElement.addEventListener("leavepictureinpicture", handleLeavePiP)

            return () => {
                videoElement.removeEventListener("enterpictureinpicture", handleEnterPiP)
                videoElement.removeEventListener("leavepictureinpicture", handleLeavePiP)
            }
        }
    }, [videoElement])

    const enterPiP = async () => {
        if (!videoElement || !isPiPSupported) return

        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture()
            }
            await videoElement.requestPictureInPicture()
        } catch (error) {
            console.error("Failed to enter Picture-in-Picture:", error)
        }
    }

    const exitPiP = async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture()
            }
        } catch (error) {
            console.error("Failed to exit Picture-in-Picture:", error)
        }
    }

    const togglePiP = async () => {
        if (isPiPActive) {
            await exitPiP()
        } else {
            await enterPiP()
        }
    }

    return {
        isPiPActive,
        isPiPSupported,
        enterPiP,
        exitPiP,
        togglePiP,
    }
}
