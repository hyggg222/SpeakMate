import { createClient } from '@supabase/supabase-js';
import { config } from './src/config/env';

async function testSupabase() {
    console.log('Testing Supabase Connection...');
    if (!config.supabaseUrl || !config.supabaseKey) {
        console.error('Missing Supabase Config (URL or Key) in .env!');
        return;
    }

    const supabase = createClient(config.supabaseUrl, config.supabaseKey);

    try {
        console.log(`Connecting to: ${config.supabaseUrl}`);
        // Test listing buckets just to verify auth
        const { data, error } = await supabase.storage.listBuckets();

        if (error) {
            console.error('❌ Supabase connection failed:', error.message);
        } else {
            console.log('✅ Success! Supabase Connected.');
            console.log('Buckets found:', data?.map(b => b.name) || 'None');

            const targetBucket = 'temp-audio-sessions';
            const hasBucket = data?.some(b => b.name === targetBucket);

            if (!hasBucket) {
                console.warn(`\n⚠️ CẢNH BÁO: Bucket "${targetBucket}" chưa tồn tại trên Supabase của bạn!`);
                console.warn(`Vui lòng truy cập Supabase Dashboard -> Storage -> Create bucket mang tên "${targetBucket}".`);
                console.warn(`Đồng thời cấu hình Object Lifecycle (TTL) tự động xóa sau 1 giờ theo chuẩn Privacy First.`);
            } else {
                console.log(`✅ Bucket "${targetBucket}" đã sẵn sàng.`);
            }
        }
    } catch (err: any) {
        console.error('❌ Network or Unknown Error:', err.message);
    }
}

testSupabase();
