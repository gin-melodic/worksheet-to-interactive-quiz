import type { Metadata } from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'PaperToQuiz - 练习册转互动试卷',
  description: '上传练习册照片，AI 自动生成互动试卷，在线作答并批改',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
