import { Chapter, QuestionType, CognitiveLevels } from '../types';

export const curriculumData: Record<string, Chapter[]> = {
  'Lớp 6': [
    {
      id: 'c6_1',
      title: 'Số tự nhiên',
      lessons: [
        { id: 'l6_1', title: 'Số tự nhiên và tập hợp các số tự nhiên. Thứ tự trong tập hợp các số tự nhiên' },
        { id: 'l6_2', title: 'Các phép tính với số tự nhiên. Phép tính luỹ thừa với số mũ tự nhiên' },
        { id: 'l6_3', title: 'Tính chia hết trong tập hợp các số tự nhiên. Số nguyên tố. Ước chung và bội chung' },
      ],
    },
    {
      id: 'c6_2',
      title: 'Số nguyên',
      lessons: [
        { id: 'l6_4', title: 'Số nguyên âm và tập hợp các số nguyên. Thứ tự trong tập hợp các số nguyên' },
        { id: 'l6_5', title: 'Các phép tính với số nguyên. Tính chia hết trong tập hợp các số nguyên' },
      ],
    },
    {
      id: 'c6_3',
      title: 'Phân số. Số thập phân',
      lessons: [
        { id: 'l6_6', title: 'Phân số. Tính chất cơ bản của phân số. So sánh phân số' },
        { id: 'l6_7', title: 'Các phép tính với phân số' },
        { id: 'l6_8', title: 'Số thập phân và các phép tính với số thập phân. Tỉ số và tỉ số phần trăm' },
      ],
    },
    {
      id: 'c6_4',
      title: 'Hình học trực quan',
      lessons: [
        { id: 'l6_9', title: 'Tam giác đều, hình vuông, lục giác đều' },
        { id: 'l6_10', title: 'Hình chữ nhật, hình thoi, hình bình hành, hình thang cân' },
        { id: 'l6_11', title: 'Tính đối xứng của hình phẳng trong thế giới tự nhiên' },
      ],
    },
    {
      id: 'c6_5',
      title: 'Một số yếu tố thống kê và xác suất',
      lessons: [
        { id: 'l6_12', title: 'Dữ liệu và biểu diễn dữ liệu' },
        { id: 'l6_13', title: 'Các kết quả có thể và sự kiện trong trò chơi, thí nghiệm' },
      ],
    }
  ],
  'Lớp 7': [
    {
      id: 'c7_1',
      title: 'Số hữu tỉ. Số thực',
      lessons: [
        { id: 'l7_1', title: 'Số hữu tỉ và tập hợp các số hữu tỉ. Thứ tự trong tập hợp các số hữu tỉ' },
        { id: 'l7_2', title: 'Các phép tính với số hữu tỉ' },
        { id: 'l7_3', title: 'Căn bậc hai số học. Số vô tỉ. Số thực' },
      ],
    },
    {
      id: 'c7_2',
      title: 'Góc và đường thẳng song song',
      lessons: [
        { id: 'l7_4', title: 'Góc ở vị trí đặc biệt. Tia phân giác của một góc' },
        { id: 'l7_5', title: 'Hai đường thẳng song song. Định lí và chứng minh một định lí' },
      ],
    },
    {
      id: 'c7_3',
      title: 'Tam giác bằng nhau',
      lessons: [
        { id: 'l7_6', title: 'Tổng các góc của một tam giác' },
        { id: 'l7_7', title: 'Hai tam giác bằng nhau. Các trường hợp bằng nhau của tam giác' },
      ],
    },
    {
      id: 'c7_4',
      title: 'Đại lượng tỉ lệ',
      lessons: [
        { id: 'l7_8', title: 'Tỉ lệ thức. Tính chất của dãy tỉ số bằng nhau' },
        { id: 'l7_9', title: 'Đại lượng tỉ lệ thuận. Đại lượng tỉ lệ nghịch' },
      ],
    },
    {
      id: 'c7_5',
      title: 'Biểu thức đại số',
      lessons: [
        { id: 'l7_10', title: 'Biểu thức đại số. Đa thức một biến' },
        { id: 'l7_11', title: 'Các phép toán với đa thức một biến' },
      ],
    },
    {
      id: 'c7_6',
      title: 'Quan hệ giữa các yếu tố trong một tam giác',
      lessons: [
        { id: 'l7_12', title: 'Quan hệ giữa cạnh và góc. Bất đẳng thức tam giác' },
        { id: 'l7_13', title: 'Sự đồng quy của các đường trong tam giác' },
      ],
    },
    {
      id: 'c7_7',
      title: 'Một số yếu tố thống kê và xác suất',
      lessons: [
        { id: 'l7_14', title: 'Thu thập, tổ chức, phân tích và xử lí dữ liệu' },
        { id: 'l7_15', title: 'Biến cố và xác suất của biến cố' },
      ],
    }
  ],
  'Lớp 8': [
    {
      id: 'c8_1',
      title: 'Đa thức nhiều biến. Phân thức đại số',
      lessons: [
        { id: 'l8_1', title: 'Đa thức nhiều biến. Các phép toán với đa thức nhiều biến' },
        { id: 'l8_2', title: 'Hằng đẳng thức đáng nhớ và ứng dụng' },
        { id: 'l8_3', title: 'Phân thức đại số. Các phép toán với phân thức đại số' },
      ],
    },
    {
      id: 'c8_2',
      title: 'Hình khối trong thực tiễn',
      lessons: [
        { id: 'l8_4', title: 'Hình chóp tam giác đều. Hình chóp tứ giác đều' },
      ],
    },
    {
      id: 'c8_3',
      title: 'Định lí Pythagore. Tứ giác',
      lessons: [
        { id: 'l8_5', title: 'Định lí Pythagore' },
        { id: 'l8_6', title: 'Tứ giác. Các loại tứ giác đặc biệt (Hình thang, bình hành, chữ nhật, thoi, vuông)' },
      ],
    },
    {
      id: 'c8_4',
      title: 'Hàm số và đồ thị',
      lessons: [
        { id: 'l8_7', title: 'Khái niệm hàm số và mặt phẳng tọa độ' },
        { id: 'l8_8', title: 'Hàm số bậc nhất và đồ thị của hàm số bậc nhất' },
      ],
    },
    {
      id: 'c8_5',
      title: 'Phương trình bậc nhất một ẩn',
      lessons: [
        { id: 'l8_9', title: 'Phương trình bậc nhất một ẩn' },
        { id: 'l8_10', title: 'Giải bài toán bằng cách lập phương trình' },
      ],
    },
    {
      id: 'c8_6',
      title: 'Định lí Thalès. Tam giác đồng dạng',
      lessons: [
        { id: 'l8_11', title: 'Định lí Thalès trong tam giác. Đường trung bình của tam giác' },
        { id: 'l8_12', title: 'Hai tam giác đồng dạng. Các trường hợp đồng dạng của tam giác' },
        { id: 'l8_13', title: 'Hình đồng dạng' },
      ],
    },
    {
      id: 'c8_7',
      title: 'Một số yếu tố thống kê và xác suất',
      lessons: [
        { id: 'l8_14', title: 'Thu thập và tổ chức dữ liệu' },
        { id: 'l8_15', title: 'Phân tích và xử lí dữ liệu' },
        { id: 'l8_16', title: 'Xác suất của biến cố' },
      ],
    }
  ],
  'Lớp 9': [
    {
      id: 'c9_1',
      title: 'Phương trình và hệ phương trình',
      lessons: [
        { id: 'l9_1', title: 'Phương trình quy về phương trình bậc nhất một ẩn' },
        { id: 'l9_2', title: 'Phương trình bậc nhất hai ẩn. Hệ hai phương trình bậc nhất hai ẩn' },
        { id: 'l9_3', title: 'Giải bài toán bằng cách lập hệ phương trình' },
      ],
    },
    {
      id: 'c9_2',
      title: 'Bất đẳng thức và bất phương trình',
      lessons: [
        { id: 'l9_4', title: 'Bất đẳng thức. Tính chất của bất đẳng thức' },
        { id: 'l9_5', title: 'Bất phương trình bậc nhất một ẩn' },
      ],
    },
    {
      id: 'c9_3',
      title: 'Căn bậc hai và căn bậc ba',
      lessons: [
        { id: 'l9_6', title: 'Căn bậc hai. Các phép tính với căn bậc hai' },
        { id: 'l9_7', title: 'Căn bậc ba' },
      ],
    },
    {
      id: 'c9_4',
      title: 'Hệ thức lượng trong tam giác vuông',
      lessons: [
        { id: 'l9_8', title: 'Tỉ số lượng giác của góc nhọn' },
        { id: 'l9_9', title: 'Hệ thức giữa cạnh và góc của tam giác vuông' },
      ],
    },
    {
      id: 'c9_5',
      title: 'Đường tròn',
      lessons: [
        { id: 'l9_10', title: 'Đường tròn. Sự xác định đường tròn. Tính chất đối xứng' },
        { id: 'l9_11', title: 'Vị trí tương đối của đường thẳng và đường tròn, hai đường tròn' },
        { id: 'l9_12', title: 'Góc với đường tròn. Tứ giác nội tiếp' },
        { id: 'l9_13', title: 'Độ dài đường tròn, cung tròn. Diện tích hình tròn, quạt tròn' },
      ],
    },
    {
      id: 'c9_6',
      title: 'Hàm số y = ax^2. Phương trình bậc hai',
      lessons: [
        { id: 'l9_14', title: 'Hàm số y = ax^2 (a khác 0) và đồ thị' },
        { id: 'l9_15', title: 'Phương trình bậc hai một ẩn. Công thức nghiệm' },
        { id: 'l9_16', title: 'Định lí Viète và ứng dụng' },
      ],
    },
    {
      id: 'c9_7',
      title: 'Hình trụ. Hình nón. Hình cầu',
      lessons: [
        { id: 'l9_17', title: 'Hình trụ. Diện tích xung quanh và thể tích' },
        { id: 'l9_18', title: 'Hình nón. Diện tích xung quanh và thể tích' },
        { id: 'l9_19', title: 'Hình cầu. Diện tích mặt cầu và thể tích' },
      ],
    },
    {
      id: 'c9_8',
      title: 'Một số yếu tố thống kê và xác suất',
      lessons: [
        { id: 'l9_20', title: 'Tần số. Tần số tương đối' },
        { id: 'l9_21', title: 'Biểu đồ tần số tương đối' },
        { id: 'l9_22', title: 'Xác suất của biến cố trong một số mô hình xác suất đơn giản' },
      ],
    }
  ]
};

// Default backward compatibility exports
export const chaptersData: Chapter[] = curriculumData['Lớp 6'];

export const initialQuestionTypes: QuestionType[] = [
  { id: 'trac_nghiem', name: 'Trắc nghiệm', quantity: 12, points: 3 },
  { id: 'dung_sai', name: 'Đúng/Sai', quantity: 4, points: 4 },
  { id: 'tra_loi_ngan', name: 'Trả lời ngắn', quantity: 6, points: 3 },
  { id: 'tu_luan', name: 'Tự luận', quantity: 1, points: 0 },
];

export const initialCognitiveLevels: CognitiveLevels = {
  knowledge: 40,
  comprehension: 30,
  application: 20,
  highApplication: 10,
};
