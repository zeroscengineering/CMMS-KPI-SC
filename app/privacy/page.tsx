export const metadata = { title: "นโยบายความเป็นส่วนตัว | CMMS KPI SC" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-3 rounded-xl border bg-white p-6 text-sm leading-relaxed">
      <h1 className="text-xl font-semibold">นโยบายความเป็นส่วนตัว</h1>
      <p>ระบบ CMMS KPI SC เป็นระบบภายในของ บริษัท เอสซี โซลูชั่น จำกัด ใช้บันทึกและประเมินผลการปฏิบัติงานของทีมวิศวกรและช่างเทคนิค</p>
      <h2 className="pt-2 font-semibold">ข้อมูลที่เก็บ</h2>
      <p>ชื่อ ตำแหน่ง หน้าที่ความรับผิดชอบ และผลการประเมินของพนักงาน รวมถึงอีเมลของผู้ใช้งานระบบเพื่อใช้ล็อกอิน ข้อมูลเก็บไว้ในฐานข้อมูล Supabase ของบริษัท และเข้าถึงได้เฉพาะผู้ใช้ที่ได้รับสิทธิ์</p>
      <h2 className="pt-2 font-semibold">การเชื่อมต่อ Google Drive</h2>
      <p>ระบบใช้สิทธิ์ Google Drive เพียงเพื่ออัปโหลดไฟล์รายงานสรุป KPI ที่ระบบสร้างขึ้นไปยังโฟลเดอร์ที่บริษัทกำหนดเท่านั้น ระบบไม่อ่าน ไม่แก้ไข และไม่แบ่งปันไฟล์อื่นของผู้ใช้</p>
      <h2 className="pt-2 font-semibold">การเปิดเผยข้อมูล</h2>
      <p>บริษัทไม่ขาย ไม่แลกเปลี่ยน และไม่เปิดเผยข้อมูลแก่บุคคลภายนอก ยกเว้นตามที่กฎหมายกำหนด</p>
      <h2 className="pt-2 font-semibold">ติดต่อ</h2>
      <p>zero.scengineering@gmail.com</p>
    </article>
  );
}
