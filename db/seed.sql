INSERT OR IGNORE INTO muscles(name) VALUES ('Chest'),('Back'),('Biceps'),('Triceps'),('Shoulders'),('Quadriceps'),('Hamstrings'),('Calves'),('Abs'),('Glutes');
INSERT INTO exercises(name,muscle_id,equipment,difficulty,description) VALUES
 ('Push-Up',(SELECT id FROM muscles WHERE name='Chest'),'Bodyweight','Beginner','Classic push-up'),
 ('Pull-Up',(SELECT id FROM muscles WHERE name='Back'),'Bodyweight','Intermediate','Pull-up for lats'),
 ('Biceps Curl',(SELECT id FROM muscles WHERE name='Biceps'),'Dumbbell','Beginner','Dumbbell curl');