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
      const detections = await faceapi.detectAllFaces(
        imageRef.current,
        new faceapi.TinyFaceDetectorOptions()
      );

      // 画像の実際のサイズと表示サイズの比率を計算
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

  // 絵文字のレンダリング用のヘルパー関数
  const renderEmoji = (char: string) => {
    return {
      __html: twemoji.parse(char, {
        folder: 'svg',
        ext: '.svg',
        base: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/',
      }),
    };
  };

  return (
    <div class="max-w-4xl mx-auto p-5">
      <div class="bg-white p-5 rounded-lg shadow-lg">
        <h1 class="text-2xl font-bold text-center text-gray-800 mb-5">
          Face Emoji App
        </h1>

        <div
          class="border-2 border-dashed border-gray-300 p-5 text-center cursor-pointer hover:bg-gray-50 transition-colors"
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
          <div class="text-center my-5">
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
              />
              {emojis.map((emoji) => (
                <div
                  key={emoji.id}
                  class={`absolute select-none cursor-move ${
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
                    class="w-full h-full"
                    dangerouslySetInnerHTML={renderEmoji(emoji.char)}
                  />
                </div>
              ))}
            </div>

            <div class="mt-5 space-y-4">
              <div class="space-x-2">
                <button
                  onClick={detectAndPlaceEmojis}
                  class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                >
                  Detect Faces & Place Emojis
                </button>
                <button
                  onClick={removeSelectedEmoji}
                  class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                >
                  Remove Selected Emoji
                </button>
                <button
                  onClick={clearAllEmojis}
                  class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                >
                  Clear All
                </button>
              </div>

              <div>
                <h3 class="font-bold mb-2">Select Emoji</h3>
                <div class="grid grid-cols-8 gap-1">
                  {EMOJIS.map((emoji) => (
                    <div
                      key={emoji}
                      class={`text-2xl text-center cursor-pointer p-2 rounded hover:bg-gray-100 flex justify-center ${
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
                        class="w-10 h-10"
                        dangerouslySetInnerHTML={renderEmoji(emoji)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 class="font-bold mb-2">Adjust Emoji Size</h3>
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
