
import { GoogleGenAI, Type } from "@google/genai";
import { VerificationRequest } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const GeminiService = {
  /**
   * Extract information from an image (OCR) for Verification Requests
   */
  extractVerificationInfo: async (base64Image: string): Promise<Partial<VerificationRequest>> => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: 'Hãy trích xuất thông tin từ hình ảnh công văn/văn bản này. Trả về JSON với các trường: dispatchNumber (số công văn), date (ngày tháng năm), offenderName (họ tên người vi phạm), idCard (CCCD/CMND), yob (năm sinh), address (hộ khẩu/địa chỉ), violationContent (nội dung vi phạm).' }
          ]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              dispatchNumber: { type: Type.STRING },
              date: { type: Type.STRING },
              offenderName: { type: Type.STRING },
              idCard: { type: Type.STRING },
              yob: { type: Type.STRING },
              address: { type: Type.STRING },
              violationContent: { type: Type.STRING },
            }
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text) as Partial<VerificationRequest>;
      }
      return {};
    } catch (error) {
      console.error("Gemini OCR Error:", error);
      throw error;
    }
  },

  /**
   * Reconstruct a full document from images into HTML (Decree 30 Standard)
   */
  reconstructDocument: async (base64Images: string[]): Promise<string> => {
    try {
      const parts = base64Images.map(img => ({
        inlineData: { mimeType: 'image/jpeg', data: img }
      }));

      const prompt = `
        Bạn là một chuyên viên văn thư lưu trữ cao cấp. Nhiệm vụ của bạn là nhìn vào các hình ảnh văn bản hành chính Việt Nam được cung cấp và tái tạo lại nội dung của nó thành mã HTML chuẩn.

        YÊU CẦU KỸ THUẬT:
        1.  **Font chữ & Định dạng:** Sử dụng font 'Times New Roman'. Cỡ chữ 14pt. Giãn dòng 1.5 (line-height: 1.5).
        2.  **Phần đầu (Header):** Tái tạo chính xác Quốc hiệu, Tiêu ngữ (Bên phải) và Tên cơ quan, Số ký hiệu (Bên trái) bằng bảng (table) không viền, canh giữa 2 cột.
        3.  **Nội dung:**
            - Giữ nguyên toàn bộ nội dung văn bản, không sửa lỗi chính tả.
            - Các tiêu đề (Hồi tố, Quyết định...) phải in đậm, canh giữa.
            - Các đoạn văn phải được canh đều (justify) và thụt đầu dòng 1.27cm (sử dụng style="text-indent: 1.27cm").
        4.  **Phần cuối (Footer):** Tái tạo phần Nơi nhận và Chữ ký/Đóng dấu bằng bảng 2 cột.
        5.  **Output:** Chỉ trả về mã HTML (nội dung bên trong thẻ body). KHÔNG trả về Markdown (\`\`\`html). KHÔNG giải thích thêm.

        Mẫu CSS inline cần dùng:
        - style="font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.5;"
        - style="text-align: justify; text-indent: 1.27cm;"
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [...parts, { text: prompt }]
        }
      });

      let html = response.text || '';
      // Clean up markdown code blocks if Gemini adds them
      html = html.replace(/```html/g, '').replace(/```/g, '');
      return html;
    } catch (error) {
      console.error("Gemini Reconstruct Error:", error);
      return "<p>Lỗi khi tái tạo văn bản. Vui lòng thử lại.</p>";
    }
  },

  /**
   * Generate a formal response letter based on verification results and a specific template
   */
  generateResponseLetter: async (req: VerificationRequest, template?: string): Promise<string> => {
    try {
      let prompt = '';

      if (template) {
        prompt = `
          Bạn là công cụ điền dữ liệu tự động (Fill-in-the-blanks).
          
          DỮ LIỆU ĐẦU VÀO:
          - Số công văn: ${req.dispatchNumber}
          - Ngày yêu cầu: ${req.date}
          - Họ tên: ${req.offenderName}
          - Năm sinh: ${req.yob}
          - CCCD: ${req.idCard}
          - Hộ khẩu: ${req.address}
          - Nội dung vi phạm: ${req.violationContent}
          - Kết quả xác minh: ${req.verificationResult || 'Đã xác minh thực tế, đối tượng có cư trú tại địa chỉ trên.'}

          MẪU VĂN BẢN:
          """
          ${template}
          """

          YÊU CẦU TUYỆT ĐỐI:
          1. Nhiệm vụ DUY NHẤT là tìm các từ khóa trong dấu <<...>> (ví dụ <<Họ tên>>, <<Số công văn>>, <<Kết quả xác minh>>...) và thay thế bằng dữ liệu tương ứng ở trên.
          2. TUYỆT ĐỐI KHÔNG thay đổi bất kỳ câu chữ, từ ngữ, dấu câu nào khác của mẫu văn bản. 
          3. KHÔNG được phép chỉnh sửa văn phong hay viết lại câu. Giữ nguyên văn bản gốc chính xác 100% ngoại trừ các vị trí đã điền.
          4. Trả về toàn bộ nội dung văn bản sau khi đã điền.
        `;
      } else {
        // Fallback to default generation if no template provided
        prompt = `
          Bạn là một cán bộ tổng hợp thuộc đội Cảnh sát trật tự.
          Hãy soạn thảo một công văn trả lời xác minh dựa trên thông tin sau:
          - Số công văn yêu cầu: ${req.dispatchNumber}
          - Ngày yêu cầu: ${req.date}
          - Đối tượng xác minh: ${req.offenderName} (SN: ${req.yob}, CCCD: ${req.idCard})
          - Địa chỉ: ${req.address}
          - Nội dung vi phạm cần xác minh: ${req.violationContent}
          - Kết quả xác minh thực tế: ${req.verificationResult || 'Qua xác minh thực tế, đối tượng có cư trú tại địa chỉ trên, hiện tại chưa phát hiện thêm vi phạm mới.'}

          Yêu cầu:
          - Văn phong hành chính công vụ, trang trọng.
          - Đầy đủ thể thức văn bản hành chính cơ bản.
          - Chỉ trả về nội dung văn bản.
        `;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            thinkingConfig: { thinkingBudget: 0 }
        }
      });
      return response.text || '';
    } catch (error) {
      console.error("Gemini Letter Gen Error:", error);
      return "Lỗi khi tạo văn bản.";
    }
  },

  /**
   * Generate a summary report from raw data
   */
  generateWeeklyReport: async (data: any, userSuggestions?: string, futureDirections?: string): Promise<string> => {
    try {
      const prompt = `
        Bạn là một cán bộ Cảnh sát trật tự (CSTT) chuyên nghiệp. Bạn KHÔNG phải Cảnh sát hình sự.
        Nhiệm vụ của bạn là viết báo cáo kết quả công tác dựa trên dữ liệu.
        
        DỮ LIỆU ĐẦU VÀO (JSON):
        ${JSON.stringify(data)}

        1. GỢI Ý TỪ NGƯỜI DÙNG: "${userSuggestions || 'Không có'}"
        2. PHƯƠNG HƯỚNG NHIỆM VỤ (Nội dung cơ sở): "${futureDirections || 'Duy trì công tác tuần tra, xử lý vi phạm.'}"
        3. CHUYÊN ĐỀ ĐANG TRIỂN KHAI: "${data.stats.activeCampaignsDetails.map((c:any) => c.name).join(', ')}"
        4. DANH SÁCH TIN BÁO 113: "${data.reports113 || ''}"

        NHIỆM VỤ:
        Viết phần NỘI DUNG CHÍNH của Báo Cáo (HTML body content).

        QUY ĐỊNH VỀ ĐỊNH DẠNG (BẮT BUỘC):
        1. Font chữ Times New Roman, size 14pt, giãn dòng 1.5.
        2. **TIÊU ĐỀ CÁC MỤC (1, 2, 3...)**: Phải IN ĐẬM và THỤT ĐẦU DÒNG 1 TAB (1.27cm).
           Code mẫu: <h4 style="font-weight: bold; text-indent: 1.27cm; margin-top: 15px; margin-bottom: 5px;">1. Tình hình chung</h4>
        3. **Nội dung văn bản**: Canh đều (justify), thụt đầu dòng đoạn văn 1.27cm.
        4. **Danh sách**: Sử dụng gạch đầu dòng (-) thủ công, thụt đầu dòng 1.27cm.

        CẤU TRÚC BÁO CÁO:

        <h4 style="...">1. Tình hình chung</h4>
        <p style="...">Trong kỳ, tình hình ANTT trên địa bàn cơ bản ổn định. Lực lượng CSTT đã duy trì nghiêm túc chế độ trực ban, tuần tra kiểm soát đảm bảo trật tự công cộng...</p>
        <p style="...">Về tình hình tai nạn giao thông: Trong kỳ xảy ra <strong>${data.stats.accidentCount}</strong> vụ. (AI hãy mô tả ngắn gọn các vụ việc từ dữ liệu accidentsDetail nếu có).</p>

        <h4 style="...">2. Kết quả thực hiện các mặt công tác</h4>
        
        <p style="font-weight: bold; text-indent: 1.27cm; margin-top: 10px;">2.1. Công tác Đăng ký xe</p>
        <ul style="list-style: none; padding: 0; margin: 0;">
           <li style="text-indent: 1.27cm; text-align: justify;">- Đăng ký xe mô tô: <strong>${data.stats.registrations.motoTotal}</strong> trường hợp (Đăng ký lần đầu: ${data.stats.registrations.motoNew}; Sang tên: ${data.stats.registrations.motoTransfer}; Cấp đổi: ${data.stats.registrations.motoReissue}; Thu hồi: ${data.stats.registrations.motoRevoke}).</li>
           <li style="text-indent: 1.27cm; text-align: justify;">- Đăng ký xe ô tô: <strong>${data.stats.registrations.autoTotal}</strong> trường hợp (Đăng ký lần đầu: ${data.stats.registrations.autoNew}; Sang tên: ${data.stats.registrations.autoTransfer}; Cấp đổi: ${data.stats.registrations.autoReissue}; Thu hồi: ${data.stats.registrations.autoRevoke}).</li>
        </ul>

        <p style="font-weight: bold; text-indent: 1.27cm; margin-top: 10px;">2.2. Kết quả thực hiện Chuyên đề & Sự kiện</p>
        <p style="...">AI hãy phân tích kỹ dữ liệu từ 'activeCampaignsDetails' trong JSON. Nhấn mạnh vào KẾT QUẢ ĐẠT ĐƯỢC (số liệu/chỉ tiêu) của từng chuyên đề. Ví dụ: "Thực hiện chuyên đề X, đã xử lý Y trường hợp, đạt Z% chỉ tiêu...".</p>

        <p style="font-weight: bold; text-indent: 1.27cm; margin-top: 10px;">2.3. Công tác tiếp nhận và xử lý tin báo</p>
        <p style="...">
           Nếu có danh sách tin báo (reports113): Hãy liệt kê ngắn gọn các vụ việc (Ví dụ: Tin báo gây rối trật tự, tin báo tai nạn...).
           Nếu không có: Ghi chính xác câu này: "Duy trì nghiêm túc công tác trực ban, trực 113, trực chỉ huy. Sẵn sàng tiếp nhận và giải quyết kịp thời các tin báo liên quan đến an ninh trật tự (gây rối trật tự công cộng, đánh nhau, tai nạn giao thông...). Trong kỳ không phát sinh vụ việc phức tạp."
        </p>

        <p style="font-weight: bold; text-indent: 1.27cm; margin-top: 10px;">2.4. Các mặt công tác khác</p>
        <ul style="list-style: none; padding: 0; margin: 0;">
           <li style="text-indent: 1.27cm; text-align: justify;">- Công tác tham mưu: ...</li>
           <li style="text-indent: 1.27cm; text-align: justify;">- Công tác tuần tra kiểm soát: ...</li>
           <li style="text-indent: 1.27cm; text-align: justify;">- Xử lý vi phạm: ...</li>
           <li style="text-indent: 1.27cm; text-align: justify;">- Các kết quả nổi bật: ${data.recentHighlights}</li>
        </ul>

        <h4 style="...">3. Đánh giá, nhận xét</h4>
        <p style="...">AI hãy tự viết đánh giá ngắn gọn dựa trên kết quả (ưu điểm, tồn tại).</p>

        <h4 style="...">4. Phương hướng nhiệm vụ kỳ tới</h4>
        <p style="...">AI hãy tổng hợp và viết mục này dựa trên 3 nguồn:
           1. Nội dung từ 'PHƯƠNG HƯỚNG NHIỆM VỤ' (nòng cốt).
           2. Danh sách 'CHUYÊN ĐỀ ĐANG TRIỂN KHAI' (cần bổ sung nhiệm vụ tiếp tục thực hiện các chuyên đề này).
           3. Từ kết quả công tác: Nếu tai nạn tăng -> nhiệm vụ tăng cường giảm tai nạn; Nếu chỉ tiêu đạt thấp -> nhiệm vụ đẩy mạnh thực hiện.
           Hãy viết thành các gạch đầu dòng rõ ràng, văn phong hành chính.
        </p>

        LƯU Ý:
        - Hãy viết thành văn bản hoàn chỉnh, lời văn hành chính, trang trọng.
        - Điền các số liệu chính xác từ dữ liệu đầu vào.
        - KHÔNG trả về Markdown. Chỉ trả về HTML body.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            thinkingConfig: { thinkingBudget: 0 }
        }
      });
      
      let html = response.text || '';
      html = html.replace(/```html/g, '').replace(/```/g, '');
      return html;
    } catch (error) {
      console.error("Gemini Report Error:", error);
      return "<p>Không thể tạo báo cáo lúc này.</p>";
    }
  }
};
