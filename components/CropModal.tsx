/*
 * Copyright 2026 MelodicGin
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use client';

import React, { useState, useRef } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Check, Loader2, Maximize2 } from 'lucide-react';

interface CropModalProps {
  image: string;
  onCrop: (croppedImage: string) => void;
  onClose: () => void;
  title?: string;
}

export function CropModal({ image, onCrop, onClose, title = '选择提取区域' }: CropModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [processing, setProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    // Initial crop: center 80%
    const initialCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 80,
        },
        aspect || 1,
        width,
        height
      ),
      width,
      height
    );
    setCrop(initialCrop);
  }

  const handleConfirm = async () => {
    if (!completedCrop || !imgRef.current) return;
    setProcessing(true);
    try {
      const croppedImage = await getCroppedImg(imgRef.current, completedCrop);
      onCrop(croppedImage);
    } catch (e) {
      console.error(e);
      alert('裁剪失败');
    } finally {
      setProcessing(false);
    }
  };

  const aspects = [
    { label: '自由', value: undefined },
    { label: '1:1', value: 1 },
    { label: '4:3', value: 4 / 3 },
    { label: '3:4', value: 3 / 4 },
    { label: '16:9', value: 16 / 9 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Maximize2 className="w-5 h-5 text-blue-600" />
            {title}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-4 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-sm font-medium text-slate-500 shrink-0">宽高比限制:</span>
          <div className="flex items-center gap-2">
            {aspects.map((a) => (
              <button
                key={a.label}
                onClick={() => {
                  setAspect(a.value);
                  if (imgRef.current) {
                    const { width, height } = imgRef.current;
                    const newCrop = centerCrop(
                      makeAspectCrop(
                        { unit: '%', width: 80 },
                        a.value || 1,
                        width,
                        height
                      ),
                      width,
                      height
                    );
                    setCrop(newCrop);
                  }
                }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${aspect === a.value
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-100 p-8 flex items-center justify-center">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            className="max-w-full"
          >
            <img
              ref={imgRef}
              src={image}
              alt="Crop target"
              onLoad={onImageLoad}
              className="max-h-[60vh] object-contain shadow-lg"
              style={{ display: 'block' }}
            />
          </ReactCrop>
        </div>

        <div className="p-6 border-t border-slate-100 flex flex-col gap-4 bg-white shrink-0">
          <div className="flex items-start gap-3 p-3 bg-blue-50 text-blue-700 rounded-xl text-xs">
            <div className="bg-blue-100 p-1 rounded-lg shrink-0 mt-0.5">
              <Check className="w-3 h-3" />
            </div>
            <p>提示：拖动选框边角可调整提取区域大小。点击“自由”模式可随意调整宽度和高度。</p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-slate-500 font-medium hover:text-slate-800 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={processing || !completedCrop || completedCrop.width === 0}
              className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              确定提取区域
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

async function getCroppedImg(image: HTMLImageElement, pixelCrop: PixelCrop): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // Max dimensions for thumbnail to keep payload small
  const MAX_SIZE = 600;
  let targetWidth = pixelCrop.width * scaleX;
  let targetHeight = pixelCrop.height * scaleY;

  if (targetWidth > MAX_SIZE || targetHeight > MAX_SIZE) {
    if (targetWidth > targetHeight) {
      targetHeight = (MAX_SIZE / targetWidth) * targetHeight;
      targetWidth = MAX_SIZE;
    } else {
      targetWidth = (MAX_SIZE / targetHeight) * targetWidth;
      targetHeight = MAX_SIZE;
    }
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    targetWidth,
    targetHeight
  );

  // Return as JPEG with 0.6 quality to significantly reduce size
  return canvas.toDataURL('image/jpeg', 0.6);
}
