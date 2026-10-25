npx tsx src/index.ts --category=70180949

npx tsx src/update-product-images.ts 5869

https://aveon.net.ua/products_feed.xml?hash_tag=7b71fadcc4a12f03cf26a304da032fba&sales_notes=&product_ids=&label_ids=&exclude_fields=&html_description=0&yandex_cpa=&process_presence_sure=&languages=uk%2Cru&extra_fields=keywords&group_ids=

curl -L -o src/feeds/products_feed.xml "https://aveon.net.ua/products_feed.xml?hash_tag=7b71fadcc4a12f03cf26a304da032fba&sales_notes=&product_ids=&label_ids=&exclude_fields=&html_description=0&yandex_cpa=&process_presence_sure=&languages=uk%2Cru&extra_fields=keywords&group_ids="

Invoke-WebRequest -Uri "https://aveon.net.ua/products_feed.xml?hash_tag=7b71fadcc4a12f03cf26a304da032fba&sales_notes=&product_ids=&label_ids=&exclude_fields=&html_description=0&yandex_cpa=&process_presence_sure=&languages=uk%2Cru&extra_fields=keywords&group_ids=" -OutFile "src/feeds/products_feed.xml"


wget -O src/feeds/products_feed.xml "https://aveon.net.ua/products_feed.xml?hash_tag=7b71fadcc4a12f03cf26a304da032fba&sales_notes=&product_ids=&label_ids=&exclude_fields=&html_description=0&yandex_cpa=&process_presence_sure=&languages=uk%2Cru&extra_fields=keywords&group_ids="


curl -L --ssl-no-revoke -o src/feeds/products_feed.xml "https://aveon.net.ua/products_feed.xml?hash_tag=7b71fadcc4a12f03cf26a304da032fba&sales_notes=&product_ids=&label_ids=&exclude_fields=&html_description=0&yandex_cpa=&process_presence_sure=&languages=uk%2Cru&extra_fields=keywords&group_ids="


curl -L --ssl-no-revoke -o src/feeds/mangalzavod_products_feed.xml "https://mangalzavod.com.ua/products_feed.xml?hash_tag=8368a75acdbd0488a2d8a18e3d8f3e30&sales_notes=&product_ids=&label_ids=12765333%2C12226389&exclude_fields=&html_description=0&yandex_cpa=&process_presence_sure=&languages=uk&extra_fields=&group_ids="