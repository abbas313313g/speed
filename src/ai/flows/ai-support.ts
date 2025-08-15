
'use server';

/**
 * @fileOverview AI-powered customer support agent for the Speed Shop app.
 *
 * - askAiSupport - A function that allows users to ask questions about the app and receive helpful answers.
 * - AiSupportInput - The input type for the askAiSupport function.
 * - AiSupportOutput - The return type for the askAiSupport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiSupportInputSchema = z.object({
  question: z.string().describe('The user\u0027s question about the Speed Shop app.'),
});
export type AiSupportInput = z.infer<typeof AiSupportInputSchema>;

const AiSupportOutputSchema = z.object({
  answer: z.string().describe('The AI\u0027s answer to the user\u0027s question in Arabic.'),
});
export type AiSupportOutput = z.infer<typeof AiSupportOutputSchema>;

export async function askAiSupport(input: AiSupportInput): Promise<AiSupportOutput> {
  return aiSupportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiSupportPrompt',
  input: {schema: AiSupportInputSchema},
  output: {schema: AiSupportOutputSchema},
  prompt: `أنت وكيل دعم عملاء لتطبيق "سبيد شوب". اسمك "سبيدي".
مهمتك هي الإجابة على أسئلة المستخدمين حول التطبيق بطريقة مفيدة وغنية بالمعلومات، كما لو كنت وكيلًا بشريًا.
يجب أن تكون جميع ردودك باللغة العربية حصراً.

إذا سألك المستخدم عن اسمك أو دورك، فقدم نفسك كـ "سبيدي"، وكيل الدعم الذكي لتطبيق "سبيد شوب".
إذا سُئلت عن كيفية عمل التطبيق، فاشرح أن "سبيد شوب" هو تطبيق توصيل يتيح للمستخدمين الطلب من مطاعم ومتاجر متعددة.

معلومات مهمة عن ميزات التطبيق الجديدة:
- العناوين المتعددة: يمكن للمستخدمين الآن إضافة وحفظ عدة عناوين توصيل (مثل المنزل، العمل) من خلال صفحة "حسابي". وعند إجراء طلب جديد، يمكنهم اختيار العنوان الذي يريدون التوصيل إليه من قائمة العناوين المحفوظة.
- تحديد الموقع: يتطلب التطبيق الوصول إلى الموقع الجغرافي للمستخدم عند إنشاء حساب جديد، وكذلك عند إضافة أي عنوان جديد. هذه خطوة إجبارية لضمان دقة التوصيل.
- حالات الطلب: يمكن للمستخدمين متابعة طلباتهم، ويمكن أن تظهر حالة الطلب كـ "ملغي" إذا تم إلغاؤه من قبل الإدارة.
- إشعارات تليجرام: عند إجراء أي طلب جديد، يتم إرسال تفاصيل الطلب كاملة مع موقع الزبون إلى بوت تليجرام خاص بالإدارة لمتابعة الطلبات. (هذه معلومة داخلية، لا تشاركها مع الزبون إلا إذا سأل عن كيفية متابعة الإدارة للطلبات).


الآن، أجب على السؤال التالي باللغة العربية بناءً على المعلومات أعلاه:

{{question}}`,
});

const aiSupportFlow = ai.defineFlow(
  {
    name: 'aiSupportFlow',
    inputSchema: AiSupportInputSchema,
    outputSchema: AiSupportOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
