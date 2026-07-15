const fs = require('fs');

function fixPaymentService() {
  const p = 'src/services/payment.service.ts';
  let content = fs.readFileSync(p, 'utf8');
  content = `export interface MockPaymentRow { id: string; created_at: string; total_amount: number; status: string; }\n` + content;
  content = content.replace(/Promise<Result<unknown\[\]>>/g, "Promise<Result<MockPaymentRow[]>>");
  fs.writeFileSync(p, content);
}
fixPaymentService();
