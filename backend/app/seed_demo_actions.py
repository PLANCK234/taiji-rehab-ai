"""Idempotent DEMO_ONLY Tai Chi action catalog for the local synthetic Demo.

Descriptions follow common simplified Tai Chi technique for on-screen guidance. They
contain no dosage, intensity or efficacy claim and are not a clinical prescription.
The seed owns these marked rows: rerunning it brings their text up to date, while
run history keeps referencing the same stable action IDs.
"""

import os

from sqlalchemy.orm import Session

from app.db import get_engine
from app.models import DemoAction
from app.runtime import demo_enabled

CATALOG = [
    # Grade I · 基础太极演示模式（站立完整动作）
    ("I-01", "起势", "基础", "I",
     "两脚开立，两臂前举再屈膝下按，体会上下相随、动作连贯。",
     ["自然站立，左脚向左开步，两脚平行与肩同宽，目视前方",
      "两臂缓缓向前平举，与肩同高同宽，掌心向下",
      "上体保持正直，两腿屈膝下蹲，两掌轻轻下按至腹前",
      "全程呼吸自然，动作匀速不停顿"]),
    ("I-02", "云手", "上肢", "I",
     "以腰为轴带动两手在体前交替划弧，重心随之左右转移，眼随手走。",
     ["开步站稳，重心落在两腿之间",
      "腰向左转，右手经腹前划弧至左肩前，左手翻掌下落",
      "重心移向左腿，右脚向左脚轻轻并步",
      "向右重复，两手交替如行云，肩肘始终放松"]),
    ("I-03", "开合手", "上肢", "I",
     "两掌在胸前一开一合，配合呼吸，练习沉肩坠肘与身体中正。",
     ["两掌立于胸前，掌心相对，相距约一拳",
      "吸气，两掌慢慢向左右拉开至与肩同宽",
      "呼气，两掌慢慢向内合拢，不相触",
      "肩肘放松下沉，头顶虚领，身体保持中正"]),
    ("I-04", "收势", "基础", "I",
     "两手翻掌下落，回到自然站立，调匀呼吸后结束。",
     ["两手向前平举，翻转掌心向下",
      "两手缓缓下落至大腿两侧",
      "左脚轻轻收回，并步站立",
      "静立片刻，调匀呼吸后结束"]),
    # Grade II · 简化站立太极演示模式（减小幅度、可就近扶持）
    ("II-01", "简化起势", "基础", "II",
     "减小屈膝深度的站立起势，旁边可放置稳固椅子以备扶持。",
     ["两脚开立与肩同宽，身旁放置一把稳固的椅子",
      "两臂慢慢前举至胸前高度即可",
      "微屈膝，两掌轻轻下按，不追求下蹲深度",
      "呼吸自然，动作慢而连贯"]),
    ("II-02", "简化云手", "上肢", "II",
     "原地不移步，以腰带手做云手，重心只做小幅左右转移。",
     ["两脚开立略宽于肩，膝盖微屈",
      "腰向左转，两手随之在体前划弧",
      "重心小幅移向左侧，再回到中间",
      "向右重复，转腰幅度以舒适为限"]),
    ("II-03", "简化开合手", "上肢", "II",
     "站立位小幅度开合手，重点放在呼吸与手臂的协调。",
     ["两脚开立，两掌立于胸前，掌心相对",
      "吸气时两掌慢慢分开至略宽于胸",
      "呼气时两掌慢慢合拢",
      "肩部放松，不耸肩、不憋气"]),
    ("II-04", "简化收势", "基础", "II",
     "缓慢落手并步，结束前静立调息。",
     ["两手前举至胸前，翻掌向下",
      "两手慢慢下落至身体两侧",
      "收脚并步，必要时一手扶椅",
      "静立调息后结束"]),
    # Grade III · 坐位 / 扶椅太极演示模式
    ("III-01", "坐位起势", "坐位", "III",
     "坐在稳固椅子的前半部完成起势，上肢动作与呼吸配合。",
     ["坐于稳固、无轮椅子的前半部，双脚平放与肩同宽",
      "腰背挺直，两臂缓缓前举至肩高",
      "两掌慢慢下按至大腿上方",
      "动作与呼吸配合，量力而行"]),
    ("III-02", "坐位云手", "坐位", "III",
     "坐姿下以腰带动两手交替划弧，练习转体与上肢协调。",
     ["端坐，双脚平放，背部离开椅背",
      "上体向左转，右手经腹前划弧至左侧",
      "回正后向右转，左手划弧至右侧",
      "眼随手动，转体幅度以舒适为限"]),
    ("III-03", "扶椅重心转移", "扶椅", "III",
     "双手扶稳椅背，在两脚之间缓慢左右转移重心。",
     ["站在椅背后方，双手扶稳椅背",
      "两脚开立与肩同宽，膝盖微屈",
      "重心缓慢移向左脚，稍停后回到中间",
      "换向右侧，全程保持上身正直"]),
    ("III-04", "呼吸调息", "调息", "III",
     "坐姿配合手臂缓慢升降，练习深长均匀的腹式呼吸。",
     ["端坐放松，两手置于腹前",
      "吸气时两手缓缓上托至胸前，腹部自然隆起",
      "呼气时两手缓缓下按至腹前，腹部自然回收",
      "呼吸深长均匀，不刻意憋气"]),
]


def main() -> None:
    if os.environ.get("APP_ENV") != "local" or not demo_enabled():
        raise RuntimeError("Demo action seed is restricted to synthetic local mode")
    added = updated = 0
    with Session(get_engine()) as db, db.begin():
        for order, (key, name, category, grade, explanation, steps) in enumerate(CATALOG, 1):
            expected = dict(
                name=name, category=category, demo_grade=grade, explanation=explanation,
                steps=steps, display_order=order, enabled=True, marker="DEMO_ONLY",
            )
            existing = db.get(DemoAction, key)
            if existing is None:
                db.add(DemoAction(id=key, **expected))
                added += 1
            elif existing.marker != "DEMO_ONLY":
                raise RuntimeError(f"action {key} is not a DEMO_ONLY seed row; refusing to touch")
            elif any(getattr(existing, field) != value for field, value in expected.items()):
                for field, value in expected.items():
                    setattr(existing, field, value)
                updated += 1
    print(f"DEMO_ONLY action catalog ready ({added} added, {updated} updated)")


if __name__ == "__main__":
    main()
