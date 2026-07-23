# ForgeSight real-model POC

This POC uses PatchCore anomaly detection with a ResNet-18 feature backbone.
It learns only from acceptable metal-nut images and evaluates against unseen
acceptable and defective parts. Results are measured from the MVTec AD test
split; no dashboard metric should be described as customer production data.

MVTec AD is licensed CC BY-NC-SA 4.0 and is included only as a non-commercial
benchmark. A production model must be retrained and validated on customer-owned
images captured using the target camera, lens, lighting, fixture, and line speed.
