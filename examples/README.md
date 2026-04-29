# أمثلة

ضع فيديوهات إعلانات صينية هنا (لا تُلتزم في git بسبب الحجم).

تشغيل سريع:

```bash
creative-analyzer analyze \
  --video examples/your_video.mp4 \
  --product "ساعة ذكية رياضية" \
  --description "ساعة فيها قياس النبض والخطوات والإشعارات" \
  --price 2900 --old-price 4900 \
  --phone "0555 12 34 56" \
  --out runs/run01
open runs/run01/report.html
```
