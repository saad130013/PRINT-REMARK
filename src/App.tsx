import React, { useState, useRef } from 'react';
import { Upload, FileDown, FileText, Settings, Plus, Trash2, GripVertical, Image as ImageIcon, RefreshCw, Layout, Type, PanelTop, Printer } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { ImageEntry } from './types';
import { exportToWord } from './utils/exportWord';

export default function App() {
  const [entries, setEntries] = useState<ImageEntry[]>([]);
  const [imagesPerPage, setImagesPerPage] = useState<number>(4);
  const [layout, setLayout] = useState<'side-by-side' | 'top-bottom'>('side-by-side');
  const [fontSettings, setFontSettings] = useState({ family: 'Tajawal, sans-serif', size: 16, color: '#374151' });
  const [headerSettings, setHeaderSettings] = useState({ 
    text: 'تقرير معاينة ميدانية', 
    preparedBy: '',
    reference: '',
    logo: null as string | null, 
    alignment: 'right' as 'right' | 'center',
    showPageNum: true 
  });
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = async () => {
    if (!printRef.current) return;
    
    try {
      const pages = printRef.current.querySelectorAll('.print-page');
      if (pages.length === 0) return;

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        
        // Convert page to image
        const dataUrl = await toPng(page, { 
          quality: 0.98, 
          pixelRatio: 2,
          style: {
            margin: '0',
            boxShadow: 'none',
            border: 'none',
          }
        });
        
        if (i > 0) {
          pdf.addPage();
        }
        
        // A4 dimensions: 210 x 297 mm
        pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297);
      }
      
      pdf.save(`${headerSettings.text || 'تقرير_الصور'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ أثناء إنشاء ملف PDF. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        
        // Get image dimensions
        const img = new Image();
        img.onload = () => {
          setEntries((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).substr(2, 9),
              dataUrl,
              notes: '',
              width: img.width,
              height: img.height,
            },
          ]);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input
    e.target.value = '';
  };

  const updateNote = (id: string, notes: string) => {
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, notes } : entry)));
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  const updateScale = (id: string, scale: number) => {
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, scale } : entry)));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setHeaderSettings(s => ({ ...s, logo: event.target?.result as string }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleExportWord = () => {
    exportToWord(entries, imagesPerPage, layout, fontSettings, headerSettings);
  };

  // Calculate pages
  const pages = [];
  for (let i = 0; i < entries.length; i += imagesPerPage) {
    pages.push(entries.slice(i, i + imagesPerPage));
  }

  // Determine image height based on images per page to fit on A4
  // A4 is roughly 297mm height. With margins, maybe 250mm usable.
  // 1 image: ~200mm, 2 images: ~100mm, 3 images: ~70mm, 4 images: ~50mm
  const getImageHeightClass = () => {
    switch (imagesPerPage) {
      case 1: return 'h-[600px]';
      case 2: return 'h-[350px]';
      case 3: return 'h-[220px]';
      case 4: return 'h-[160px]';
      default: return 'h-[350px]';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans" dir="rtl">
      {/* Header / Toolbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">منسق الصور والملاحظات</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-md">
              <Settings className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">صور بالصفحة:</span>
              <select
                value={imagesPerPage}
                onChange={(e) => setImagesPerPage(Number(e.target.value))}
                className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer"
              >
                {[1, 2, 3, 4].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>

            <div className="h-6 w-px bg-gray-300 mx-2"></div>

            <button
              onClick={() => handlePrint()}
              disabled={entries.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FileText className="w-4 h-4" />
              تصدير PDF
            </button>
            
            <button
              onClick={handleExportWord}
              disabled={entries.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FileDown className="w-4 h-4" />
              تصدير Word
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
        {/* Sidebar Controls */}
        <div className="w-80 shrink-0 space-y-6 no-print h-[calc(100vh-8rem)] overflow-y-auto pr-2 pb-8">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">إضافة صور</h2>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 text-blue-500 mb-2" />
                <p className="text-sm text-blue-600 font-medium">اضغط لرفع الصور</p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF</p>
              </div>
              <input type="file" className="hidden" multiple accept="image/*" onChange={handleImageUpload} />
            </label>
          </div>

          {/* Layout Settings */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Layout className="w-5 h-5 text-blue-600" />
              تخطيط الصفحة
            </h2>
            <select
              value={layout}
              onChange={(e) => setLayout(e.target.value as any)}
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
            >
              <option value="side-by-side">صورة بجانب الملاحظة</option>
              <option value="top-bottom">صورة بالأعلى والملاحظة بالأسفل</option>
            </select>
          </div>

          {/* Font Settings */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Type className="w-5 h-5 text-blue-600" />
              تنسيق الخط
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-700">نوع الخط</label>
                <select
                  value={fontSettings.family}
                  onChange={(e) => setFontSettings(s => ({ ...s, family: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                >
                  <option value="Tajawal, sans-serif">Tajawal</option>
                  <option value="Cairo, sans-serif">Cairo</option>
                  <option value="Almarai, sans-serif">Almarai</option>
                  <option value="Arial, sans-serif">Arial</option>
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block mb-1.5 text-sm font-medium text-gray-700">حجم الخط</label>
                  <input
                    type="number"
                    value={fontSettings.size}
                    onChange={(e) => setFontSettings(s => ({ ...s, size: Number(e.target.value) }))}
                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                  />
                </div>
                <div className="flex-1">
                  <label className="block mb-1.5 text-sm font-medium text-gray-700">لون الخط</label>
                  <input
                    type="color"
                    value={fontSettings.color}
                    onChange={(e) => setFontSettings(s => ({ ...s, color: e.target.value }))}
                    className="w-full h-[42px] p-1 bg-gray-50 border border-gray-300 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Header & Footer Settings */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PanelTop className="w-5 h-5 text-blue-600" />
              الترويسة والتذييل
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-700">عنوان التقرير</label>
                <input
                  type="text"
                  value={headerSettings.text}
                  onChange={(e) => setHeaderSettings(s => ({ ...s, text: e.target.value }))}
                  placeholder="مثال: تقرير معاينة ميدانية..."
                  className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block mb-1.5 text-sm font-medium text-gray-700">إعداد (الاسم)</label>
                  <input
                    type="text"
                    value={headerSettings.preparedBy}
                    onChange={(e) => setHeaderSettings(s => ({ ...s, preparedBy: e.target.value }))}
                    placeholder="اسم المُعِد..."
                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                  />
                </div>
                <div className="flex-1">
                  <label className="block mb-1.5 text-sm font-medium text-gray-700">رقم المرجع</label>
                  <input
                    type="text"
                    value={headerSettings.reference}
                    onChange={(e) => setHeaderSettings(s => ({ ...s, reference: e.target.value }))}
                    placeholder="مثال: REF-2023-01..."
                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-700">شعار الشركة (Logo)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-r-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {headerSettings.logo && (
                  <button
                    onClick={() => setHeaderSettings(s => ({ ...s, logo: null }))}
                    className="text-xs text-red-500 mt-2 hover:underline"
                  >
                    إزالة الشعار الحالي
                  </button>
                )}
              </div>
              {/* Alignment Control */}
              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-700">محاذاة الترويسة</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="headerAlignment" 
                      checked={headerSettings.alignment === 'right'} 
                      onChange={() => setHeaderSettings(s => ({ ...s, alignment: 'right' }))}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">يمين</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="headerAlignment" 
                      checked={headerSettings.alignment === 'center'} 
                      onChange={() => setHeaderSettings(s => ({ ...s, alignment: 'center' }))}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">وسط</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
                <input
                  type="checkbox"
                  id="showPageNum"
                  checked={headerSettings.showPageNum}
                  onChange={(e) => setHeaderSettings(s => ({ ...s, showPageNum: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="showPageNum" className="text-sm font-medium text-gray-700 cursor-pointer">
                  إظهار أرقام الصفحات
                </label>
              </div>
            </div>
          </div>

          {entries.length > 0 && (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold mb-4">ترتيب الصور</h2>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {entries.map((entry, index) => (
                  <div key={entry.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-md border border-gray-100">
                    <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                    <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-gray-200">
                      <img src={entry.dataUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-sm text-gray-600 truncate flex-1">صورة {index + 1}</span>
                    <button
                      onClick={() => removeEntry(entry.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Document Preview */}
        <div className="flex-1 overflow-x-auto pb-12">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 bg-white rounded-xl border border-gray-200 border-dashed">
              <ImageIcon className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">لا توجد صور</h3>
              <p className="text-gray-500 mt-1">قم برفع بعض الصور للبدء في تنسيق التقرير</p>
            </div>
          ) : (
            <div className="space-y-8 flex flex-col items-center" ref={printRef}>
              {pages.map((pageEntries, pageIndex) => (
                <div 
                  key={pageIndex} 
                  className="w-[210mm] min-h-[297mm] bg-white shadow-md print:shadow-none print:border-none border border-gray-200 print-page p-[20mm] flex flex-col gap-4"
                >
                  {/* Formal Header */}
                  {(headerSettings.text || headerSettings.logo || headerSettings.preparedBy || headerSettings.reference) && (
                    <div className={`flex ${headerSettings.alignment === 'center' ? 'flex-col items-center text-center' : 'justify-between items-start'} border-b-4 border-double border-gray-800 pb-4 mb-4 shrink-0`}>
                      {headerSettings.alignment === 'center' ? (
                        <>
                          {headerSettings.logo && (
                            <img src={headerSettings.logo} alt="Logo" className="h-20 object-contain max-w-[200px] mb-3" />
                          )}
                          <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: fontSettings.family }}>
                            {headerSettings.text}
                          </h2>
                          {(headerSettings.reference || headerSettings.preparedBy) && (
                            <div className="flex gap-6 text-sm text-gray-800" style={{ fontFamily: fontSettings.family }}>
                              {headerSettings.reference && (
                                <p><span className="font-bold">المرجع:</span> {headerSettings.reference}</p>
                              )}
                              {headerSettings.preparedBy && (
                                <p><span className="font-bold">إعداد:</span> {headerSettings.preparedBy}</p>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-4">
                            {headerSettings.logo && (
                              <img src={headerSettings.logo} alt="Logo" className="h-16 object-contain max-w-[150px]" />
                            )}
                            <div>
                              <h2 
                                className="text-2xl font-bold text-gray-900" 
                                style={{ fontFamily: fontSettings.family }}
                              >
                                {headerSettings.text}
                              </h2>
                            </div>
                          </div>
                          <div className="text-sm text-gray-800 space-y-1.5 text-left border-r-2 border-gray-200 pr-4" style={{ fontFamily: fontSettings.family }}>
                            {headerSettings.reference && (
                              <p className="flex justify-end gap-2">
                                <span className="font-bold">المرجع:</span>
                                <span>{headerSettings.reference}</span>
                              </p>
                            )}
                            {headerSettings.preparedBy && (
                              <p className="flex justify-end gap-2">
                                <span className="font-bold">إعداد:</span>
                                <span>{headerSettings.preparedBy}</span>
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 flex flex-col gap-6">
                    {pageEntries.map((entry, index) => {
                      const globalIndex = (pageIndex * imagesPerPage) + index + 1;
                      return (
                      <div key={entry.id} className="flex flex-col border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm flex-1">
                        {/* Item Header */}
                        <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 flex justify-between items-center">
                          <span className="font-bold text-gray-800 text-sm" style={{ fontFamily: fontSettings.family }}>
                            مرفق رقم ({globalIndex})
                          </span>
                        </div>
                        
                        <div className={`flex ${layout === 'side-by-side' ? 'flex-row' : 'flex-col'} flex-1`}>
                          {/* Image Side */}
                          <div className={`${layout === 'side-by-side' ? 'w-1/2 border-l border-gray-300' : 'w-full flex-1 min-h-0 border-b border-gray-300'} flex flex-col justify-center bg-gray-50 relative group`}>
                            <div className={`w-full ${layout === 'side-by-side' ? getImageHeightClass() : 'h-full min-h-[150px]'} flex items-center justify-center p-2`}>
                              <img 
                                src={entry.dataUrl} 
                                alt="Uploaded" 
                                style={{ transform: `scale(${entry.scale || 1})`, transformOrigin: 'center' }}
                                className="max-w-full max-h-full object-contain transition-transform"
                              />
                            </div>
                            
                            {/* Scale Controls Overlay */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity no-print flex items-center gap-2 w-[85%] max-w-xs border border-gray-200 z-10" dir="rtl">
                              <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">الحجم:</span>
                              <input
                                type="range"
                                min="0.1"
                                max="3"
                                step="0.05"
                                value={entry.scale || 1}
                                onChange={(e) => updateScale(entry.id, parseFloat(e.target.value))}
                                className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                              />
                              <span className="text-xs font-medium text-gray-600 w-9 text-center">
                                {Math.round((entry.scale || 1) * 100)}%
                              </span>
                              <button
                                onClick={() => updateScale(entry.id, 1)}
                                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                                title="إعادة الحجم الأصلي"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-gray-600" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Notes Side */}
                          <div className={`${layout === 'side-by-side' ? 'w-1/2' : 'w-full shrink-0'} flex flex-col`}>
                            <textarea
                              value={entry.notes}
                              onChange={(e) => updateNote(entry.id, e.target.value)}
                              placeholder="اكتب تفاصيل المرفق والملاحظات هنا..."
                              style={{ 
                                fontFamily: fontSettings.family,
                                fontSize: `${fontSettings.size}px`,
                                color: fontSettings.color
                              }}
                              className={`w-full ${layout === 'side-by-side' ? 'h-full min-h-[100px]' : 'min-h-[80px]'} p-4 bg-white border-none focus:ring-0 resize-none transition-all leading-relaxed print:bg-white print:p-4 print:resize-none`}
                            />
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>

                  {/* Footer */}
                  {(headerSettings.showDate || headerSettings.showPageNum) && (
                    <div 
                      className="flex justify-between items-center border-t-2 border-gray-200 pt-4 mt-auto shrink-0 text-sm text-gray-500"
                      style={{ fontFamily: fontSettings.family }}
                    >
                      <div>
                        {headerSettings.showDate && new Date().toLocaleDateString('ar-SA')}
                      </div>
                      <div>
                        {headerSettings.showPageNum && `صفحة ${pageIndex + 1} من ${pages.length}`}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
