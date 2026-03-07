// Run this script to populate the story banking for the first user
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: profiles, error } = await supabase.from('profiles').select('id, email').limit(1);

    if (error || !profiles || profiles.length === 0) {
        console.error("No users found or error:", error);
        process.exit(1);
    }

    const userId = profiles[0].id;
    console.log("Adding stories for user:", profiles[0].email, userId);

    const stories = [
        {
            user_id: userId,
            title: "Tối ưu hoá hiệu suất API hệ thống",
            raw_input: "Tôi đã tối ưu hoá API chậm bằng cách thêm caching và index database, giảm độ trễ từ 2s xuống 200ms.",
            input_method: "text",
            framework: "STAR",
            structured: {
                situation: "Hệ thống legacy có một API lấy dữ liệu báo cáo rất chậm, thường mất hơn 2 giây, gây ảnh hưởng trải nghiệm người dùng.",
                task: "Nhiệm vụ của tôi là phân tích nguyên nhân bottleneck và tối ưu hoá thời gian phản hồi (latency) xuống dưới 500ms.",
                action: "Tôi đã sử dụng công cụ APM để profiling, phát hiện ra query CSDL không có index phù hợp, và việc tính toán lặp lại. Tôi thêm index CSDL và triển khai Redis cache cho dữ liệu ít thay đổi.",
                result: "Độ trễ API giảm xuống còn trung bình 200ms, hệ thống chịu được lượng truy cập cao hơn 30% mà không bị quá tải."
            },
            full_script: "Xin chào, tôi xin chia sẻ về một lần tôi tối ưu hoá hiệu suất hệ thống. Trong dự án trước, chúng tôi gặp vấn đề với một API cốt lõi báo cáo thường xuyên bị timeout và mất hơn 2 giây để tải. Nhiệm vụ của tôi là phải khắc phục tình trạng này ngay lập tức để cải thiện trải nghiệm người dùng.\n\nSau khi phân tích bằng các công cụ APM, tôi phát hiện ra vấn đề nằm ở các truy vấn cơ sở dữ liệu thiếu tối ưu và không tận dụng cache. Tôi đã tiến hành thiết kế lại các query, bổ sung index cần thiết trên database, và áp dụng Redis để thiết lập một caching layer cho các dữ liệu ít thay đổi. \n\nKết quả là thời gian phản hồi giảm cực kỳ ấn tượng từ 2 giây xuống chỉ còn khoảng 200ms, và hệ thống ổn định ngay cả trong thời gian cao điểm.",
            estimated_duration: 60,
            tags: ["Performance", "Optimization", "Backend"],
            status: "draft",
            practice_count: 0,
            last_score: 0
        },
        {
            user_id: userId,
            title: "Khắc phục sự cố gián đoạn dịch vụ production",
            raw_input: "Khi server sập vì bộ nhớ đầy, tôi đã viết script tự động dọn log và sửa memory leak gây ra outage.",
            input_method: "text",
            framework: "CAR",
            structured: {
                challenge: "Một lần hệ thống production bị sập giữa đêm do service bị out-of-memory. Không có cơ chế auto-scaling nào giúp bảo vệ cụm máy chủ.",
                action: "Tôi điều tra và phát hiện có memory leak từ quá trình xử lý log không được giải phóng. Tôi ngay lập tức restart các node để khôi phục dịch vụ, sau đó patch lỗi memory leak trong code Node.js, đồng thời thiết lập cảnh báo sớm trên Grafana.",
                result: "Sự cố được xử lý trong vòng 30 phút. Từ đó hệ thống không bao giờ gặp lại lỗi tương tự, và team luôn nhận được cảnh báo từ sớm nếu memory tăng cao đột biến."
            },
            full_script: "Tôi từng đối mặt với một sự cố nghiêm trọng khi hệ thống production bị sập giữa đêm do lỗi cạn kiệt bộ nhớ (OOM). Đây là một thử thách rất lớn vì khách hàng bắt đầu phàn nàn và chúng tôi cần khôi phục dịch vụ ngay lập tức.\n\nNgay khi nhận cảnh báo, tôi tham gia war-room, tạm thời khởi động lại các pod bị lỗi để dịch vụ chạy lại. Sau đó, tôi kiểm tra log và phát hiện một memory leak từ tính năng xuất dữ liệu báo cáo mới được deploy. Tôi đã nhanh chóng debug, fix lỗi vòng lặp memory rò rỉ trong runtime của Node.js, và deploy bản vá hotfix. Cuối cùng, tôi cấu hình thêm alert trên Prometheus & Grafana.\n\nKết quả là sự cố được khắc phục gọn gàng trong 30 phút và kể từ đó chúng tôi luôn chủ động dập tắt mọi nguy cơ trước khi chúng kịp gây hại cho hệ thống.",
            estimated_duration: 60,
            tags: ["Incident Response", "Debugging", "SRE"],
            status: "battle-tested",
            practice_count: 2,
            last_score: 85
        },
        {
            user_id: userId,
            title: "Lãnh đạo dự án chuyển đổi kiến trúc Microservices",
            raw_input: "Tôi dẫn dắt team 5 người tách monolith thành microservices trên Kubernetes.",
            input_method: "text",
            framework: "STAR",
            structured: {
                situation: "Dự án cũ có kiến trúc monolith đang trở nên quá cồng kềnh, khiến việc deploy tốn thời gian và thường xuyên bị conflict code giữa các team.",
                task: "Tôi được giao trọng trách dẫn dắt một nhóm kỹ sư gồm 5 người thực hiện việc chia tách khối monolith này sang kiến trúc microservices.",
                action: "Tôi bắt đầu bằng việc thiết kế lại domain-driven APIs, tách bạch các tính năng độc lập, đồng thời setup CI/CD pipeline và môi trường Kubernetes để deploy dễ dàng hơn. Trong quá trình đó, tôi cũng tổ chức các buổi training cho các thành viên trong team về Docker và K8s.",
                result: "Sau 4 tháng, dự án chuyển đổi thành công. Việc deploy giờ đây nhanh hơn gấp 4 lần và giúp mỗi nhóm phát triển độc lập với nhau, năng suất toàn công ty tăng trưởng mạnh."
            },
            full_script: "Trong quá trình làm tech lead, tôi từng quản lý dự án chuyển đổi hệ thống lõi từ kiến trúc monolith nguyên khối sang microservices trên Kubernetes. Khởi điểm ban đầu là hệ thống đã quá già cỗi, thời gian deploy có khi kéo dài vài tiếng và thường xuyên gây rủi ro conflict code lớn.\n\nTôi đã thiết kế lại toàn bộ hệ thống dựa trên phương pháp Domain Driven Design, chia cắt hệ thống thành 6 service độc lập. Bên cạnh việc tự tay code kiến trúc nền, tôi hướng dẫn team 5 người chuyển đổi mindset qua CI/CD và sử dụng Kubernetes thành thạo. Tôi áp dụng quy tắc \"tiến chậm mà chắc\" để user không hề hay biết rằng có sự thay đổi ở phía sau.\n\nThành quả đạt được cực kỳ xứng đáng: sau 4 tháng, chúng tôi hoàn tất quá trình này. Tốc độ realease tính năng mới siêu nhanh và quan trọng nhất là team hài lòng với quy trình làm việc hiệu quả và ít mệt mỏi hơn hẳn.",
            estimated_duration: 75,
            tags: ["Leadership", "Architecture", "Microservices"],
            status: "draft",
            practice_count: 0,
            last_score: 0
        }
    ];

    const { data: inserted, error: insertErr } = await supabase.from('story_entries').insert(stories).select();

    if (insertErr) {
        require('fs').writeFileSync('error.json', JSON.stringify(insertErr, null, 2));
    } else {
        console.log("Successfully inserted", inserted?.length, "stories!");
    }
}

run();
