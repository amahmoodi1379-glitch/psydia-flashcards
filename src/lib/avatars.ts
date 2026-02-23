export const ANIMAL_AVATARS = [
  { emoji: "🦁", name: "شیر" },
  { emoji: "🐯", name: "ببر" },
  { emoji: "🐻", name: "خرس" },
  { emoji: "🐼", name: "پاندا" },
  { emoji: "🐨", name: "کوالا" },
  { emoji: "🦊", name: "روباه" },
  { emoji: "🐰", name: "خرگوش" },
  { emoji: "🐱", name: "گربه" },
  { emoji: "🐶", name: "سگ" },
  { emoji: "🦝", name: "راکون" },
  { emoji: "🦄", name: "اسب شاخدار" },
  { emoji: "🐮", name: "گاو" },
  { emoji: "🐷", name: "خوک" },
  { emoji: "🐸", name: "قورباغه" },
  { emoji: "🐵", name: "میمون" },
  { emoji: "🦉", name: "جغد" },
  { emoji: "🦅", name: "عقاب" },
  { emoji: "🐧", name: "پنگوئن" },
  { emoji: "🐦", name: "پرنده" },
  { emoji: "🦜", name: "طوطی" },
  { emoji: "🐢", name: "لاک‌پشت" },
  { emoji: "🐍", name: "مار" },
  { emoji: "🦎", name: "مارمولک" },
  { emoji: "🐠", name: "ماهی" },
  { emoji: "🐬", name: "دلفین" },
  { emoji: "🐳", name: "نهنگ" },
  { emoji: "🦈", name: "کوسه" },
  { emoji: "🦋", name: "پروانه" },
  { emoji: "🐝", name: "زنبور" },
  { emoji: "🐞", name: "کفشدوزک" },
];

export function getAvatarEmoji(avatarUrl: string | null): string {
  if (!avatarUrl) return "🐱";
  const index = parseInt(avatarUrl);
  if (!isNaN(index) && index >= 0 && index < ANIMAL_AVATARS.length) {
    return ANIMAL_AVATARS[index].emoji;
  }
  return "🐱";
}
