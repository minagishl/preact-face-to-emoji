import { useEffect, useRef, useState } from 'preact/hooks';
import * as faceapi from 'face-api.js';
import twemoji from 'twemoji';

interface Emoji {
  id: string;
  char: string;
  x: number;
  y: number;
  width: number;
  scale: number;
}

export function App() {
  const [selectedEmoji, setSelectedEmoji] = useState('😀');
  const [emojis, setEmojis] = useState<Emoji[]>([]);
  const [selectedEmojiId, setSelectedEmojiId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragInfo = useRef<{
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  const EMOJIS = [
    '😀',
    '😎',
    '🤩',
    '😜',
    '🥳',
    '🤯',
    '😱',
    '🥸',
    '🤠',
    '👽',
    '🤖',
    '👹',
    '🐱',
    '🐶',
    '🐵',
    '🦊',
  ];

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setIsLoading(true);
      const MODEL_URL = 'https://unpkg.com/ai-face-detection@1.0.10/weights';
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setModelsLoaded(true);
    } catch (error) {
      console.error('Failed to load models:', error);
      alert('Failed to load face detection model. Please reload the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (file: File) => {
    if (!file.type.match('image.*')) {
      alert('Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(e.target?.result as string);
      setEmojis([]);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const detectAndPlaceEmojis = async () => {
    if (!modelsLoaded) {
      alert('Face detection model is still loading. Please wait.');
      return;
    }

    if (!imageRef.current || !imageUrl || !containerRef.current) {
      alert('Please upload an image.');
      return;
    }

    try {
      setDetecting(true); // Disable the button and show the spinner
      const detections = await faceapi.detectAllFaces(
        imageRef.current,
        new faceapi.TinyFaceDetectorOptions()
      );

      // Calculate the ratio between actual image size and display size
      const imageRect = imageRef.current.getBoundingClientRect();
      const scaleFactor = imageRef.current.naturalWidth / imageRect.width;

      const newEmojis = detections.map((detection) => ({
        id: Math.random().toString(36).substring(7),
        char: selectedEmoji,
        x: detection.box.x / scaleFactor,
        y: detection.box.y / scaleFactor,
        width: detection.box.width / scaleFactor,
        scale: 1,
      }));

      setEmojis(newEmojis);

      if (detections.length === 0) {
        alert('No faces detected. Please try another image.');
      }
    } catch (error) {
      console.error('Face detection error:', error);
      alert('Face detection failed. Please try another image.');
    } finally {
      setDetecting(false); // Re-enable the button and hide the spinner
    }
  };

  const handleMouseDown = (e: MouseEvent, emoji: Emoji) => {
    if (!containerRef.current || !imageRef.current) return;
    e.preventDefault();

    const relativeX = emoji.x;
    const relativeY = emoji.y;

    dragInfo.current = {
      startX: e.clientX,
      startY: e.clientY,
      startLeft: relativeX,
      startTop: relativeY,
    };
    setSelectedEmojiId(emoji.id);

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragInfo.current || !imageRef.current) return;

      const dx = e.clientX - dragInfo.current.startX;
      const dy = e.clientY - dragInfo.current.startY;
      const { startLeft, startTop } = dragInfo.current;

      setEmojis((prev) =>
        prev.map((em) => {
          if (em.id === emoji.id) {
            return {
              ...em,
              x: startLeft + dx,
              y: startTop + dy,
            };
          }
          return em;
        })
      );
    };

    const handleMouseUp = () => {
      dragInfo.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleSizeChange = (e: Event) => {
    const scale = (e.target as HTMLInputElement).value;
    setEmojis((prev) =>
      prev.map((emoji) => {
        if (emoji.id === selectedEmojiId) {
          return { ...emoji, scale: parseFloat(scale) };
        }
        return emoji;
      })
    );
  };

  const removeSelectedEmoji = () => {
    if (selectedEmojiId) {
      setEmojis((prev) => prev.filter((emoji) => emoji.id !== selectedEmojiId));
      setSelectedEmojiId(null);
    }
  };

  const clearAllEmojis = () => {
    setEmojis([]);
    setSelectedEmojiId(null);
  };

  // Helper function for emoji rendering
  const renderEmoji = (char: string) => {
    return {
      __html: twemoji.parse(char, {
        folder: 'svg',
        ext: '.svg',
        base: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/',
      }),
    };
  };

  // Function to download the image with emojis at original quality
  const downloadImage = async () => {
    if (!imageRef.current || !imageUrl) {
      alert('Please upload an image first.');
      return;
    }

    try {
      setDownloading(true);

      // Create a hidden canvas with the original image dimensions
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Wait for the image to load completely to get correct dimensions
      await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          // Set canvas to original image size
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;

          // Draw the original image
          ctx.drawImage(img, 0, 0);
          resolve(null);
        };
        img.src = imageUrl;
      });

      // Calculate the scale factor between displayed and original image size
      const displayWidth = imageRef.current.clientWidth;
      const originalWidth = canvas.width;
      const scaleFactor = originalWidth / displayWidth;

      // Process each emoji
      for (const emoji of emojis) {
        // Load emoji SVG and convert to image
        const emojiSvgUrl = twemoji
          .parse(emoji.char, {
            folder: 'svg',
            ext: '.svg',
            base: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/',
          })
          .match(/src="([^"]+)"/)?.[1];

        if (emojiSvgUrl) {
          await new Promise((resolve) => {
            const emojiImg = new Image();
            emojiImg.onload = () => {
              // Scale emoji position and size to match original image dimensions
              const x = emoji.x * scaleFactor;
              const y = emoji.y * scaleFactor;
              const width = emoji.width * scaleFactor * emoji.scale;

              ctx.drawImage(emojiImg, x, y, width, width);
              resolve(null);
            };
            emojiImg.crossOrigin = 'anonymous';
            emojiImg.src = emojiSvgUrl;
          });
        }
      }

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'face-emoji-image.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        setDownloading(false);
      }, 'image/png');
    } catch (error) {
      console.error('Error creating download:', error);
      alert('Failed to download image. Please try again.');
      setDownloading(false);
    }
  };

  return (
    <div class="mx-auto max-w-4xl p-5">
      <div class="bg-white p-5">
        <h1 class="mb-5 text-center text-2xl font-bold text-gray-800">
          Face Emoji App
        </h1>

        <div
          class="cursor-pointer border-2 border-dashed border-gray-300 p-5 text-center transition-colors hover:bg-gray-50"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() =>
            document.querySelector<HTMLInputElement>('#imageUpload')?.click()
          }
        >
          <p>Drag & drop an image or click to select</p>
          <input
            type="file"
            id="imageUpload"
            accept="image/*"
            class="hidden"
            onChange={(e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleImageUpload(file);
            }}
          />
        </div>

        {isLoading && (
          <div class="my-5 text-center">
            <p>Loading models...</p>
          </div>
        )}

        {imageUrl && (
          <div class="mt-5">
            <div class="relative" ref={containerRef}>
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Uploaded image"
                class="max-w-full"
                crossOrigin="anonymous"
                onClick={() => setSelectedEmojiId(null)}
              />
              {emojis.map((emoji) => (
                <div
                  key={emoji.id}
                  class={`absolute cursor-move select-none ${
                    emoji.id === selectedEmojiId
                      ? 'outline-2 outline-green-500'
                      : ''
                  }`}
                  style={{
                    left: `${emoji.x}px`,
                    top: `${emoji.y}px`,
                    width: `${emoji.width}px`,
                    height: `${emoji.width}px`,
                    transform: `scale(${emoji.scale})`,
                    transformOrigin: 'top left',
                  }}
                  onMouseDown={(e) => handleMouseDown(e, emoji)}
                  onDblClick={() => {
                    setEmojis((prev) =>
                      prev.filter((em) => em.id !== emoji.id)
                    );
                    setSelectedEmojiId(null);
                  }}
                >
                  <div
                    class="h-full w-full"
                    dangerouslySetInnerHTML={renderEmoji(emoji.char)}
                  />
                </div>
              ))}
            </div>

            <div class="mt-5 space-y-4">
              <div class="flex flex-col items-center space-y-2 md:flex-row md:space-y-0 md:space-x-2">
                <button
                  onClick={detectAndPlaceEmojis}
                  disabled={detecting}
                  class="flex w-full items-center justify-center rounded bg-green-500 px-4 py-2 text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-300 md:w-fit"
                >
                  {detecting ? (
                    <>
                      <svg
                        class="mr-2 h-5 w-5 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          class="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          stroke-width="4"
                        ></circle>
                        <path
                          class="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Detecting...
                    </>
                  ) : (
                    'Detect Faces & Place Emojis'
                  )}
                </button>
                <button
                  onClick={removeSelectedEmoji}
                  class="w-full rounded bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600 md:w-fit"
                >
                  Remove Selected Emoji
                </button>
                <button
                  onClick={clearAllEmojis}
                  class="w-full rounded bg-gray-500 px-4 py-2 text-white transition-colors hover:bg-gray-600 md:w-fit"
                >
                  Clear All
                </button>
                <button
                  onClick={downloadImage}
                  disabled={downloading || !imageUrl || emojis.length === 0}
                  class="w-full rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300 md:w-fit"
                >
                  {downloading ? 'Processing...' : 'Download Image'}
                </button>
              </div>

              <div>
                <h3 class="mb-2 font-bold">Select Emoji</h3>
                <div class="grid grid-cols-8 gap-1">
                  {EMOJIS.map((emoji) => (
                    <div
                      key={emoji}
                      class={`flex cursor-pointer justify-center rounded p-2 text-center text-2xl hover:bg-gray-100 ${
                        selectedEmoji === emoji ? 'bg-gray-200' : ''
                      }`}
                      onClick={() => {
                        setSelectedEmoji(emoji);
                        if (selectedEmojiId) {
                          setEmojis((prev) =>
                            prev.map((em) => {
                              if (em.id === selectedEmojiId) {
                                return { ...em, char: emoji };
                              }
                              return em;
                            })
                          );
                        }
                      }}
                    >
                      <div
                        class="flex h-10 w-10 items-center justify-center"
                        dangerouslySetInnerHTML={renderEmoji(emoji)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 class="mb-2 font-bold">Adjust Emoji Size</h3>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={
                    emojis.find((emoji) => emoji.id === selectedEmojiId)
                      ?.scale ?? 1
                  }
                  class="w-full"
                  onChange={handleSizeChange}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
