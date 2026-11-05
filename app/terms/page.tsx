export const metadata = { title: "ข้อกำหนดการใช้งาน | CMMS KPI SC" };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-3 rounded-xl border bg-white p-6 text-sm leading-relaxed">
      <h1 className="text-xl font-semibold">ข้อกำหนดการใช้งาน</h1>
      <p>ระบบ CMMS KPI SC เป็นระบบภายในของ บริษัท เอสซี โซลูชั่น จำกัด อนุญาตให้ใช้งานเฉพาะบุคลากรที่ได้รับสิทธิ์จากบริษัทเท่านั้น</p>
      <p>ผู้ใช้ต้องเก็บรักษาบัญชีของตนเป็นความลับ ใช้ข้อมูลเพื่อการบริหารงานภายในเท่านั้น และไม่นำข้อมูลผลการประเมินของพนักงานไปเปิดเผยโดยไม่ได้รับอนุญาต</p>
      <p>บริษัทขอสงวนสิทธิ์ในการแก้ไขหรือยกเลิกการเข้าถึงระบบได้ตลอดเวลา</p>
    </article>
  );
}
