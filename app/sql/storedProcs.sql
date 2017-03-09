DROP FUNCTION IF EXISTS haversinePt;

CREATE FUNCTION haversinePt(
        point1 GEOMETRY,
        point2 GEOMETRY
    ) RETURNS FLOAT
    NO SQL DETERMINISTIC
    COMMENT 'Returns the distance in degrees on the Earth
            between two known points of latitude and longitude
            where the points are both geospatial objects'
BEGIN
    RETURN DEGREES(ACOS(
              COS(RADIANS(X(point1))) *
              COS(RADIANS(X(point2))) *
              COS(RADIANS(Y(point2)) - RADIANS(Y(point1))) +
              SIN(RADIANS(X(point1))) * SIN(RADIANS(X(point2)))
            )) * (3956 * pi()/180);

END



DELIMITER $$
DROP procedure IF EXISTS project_alike$$

CREATE procedure project_alike(
        IN project_no INT
     ) 
    LANGUAGE SQL
  READS SQL DATA
    COMMENT 'Returns projects like the current project'
BEGIN
#SET @project_no = 1100;
DECLARE cat_no int;
DECLARE subcat_no int;
DECLARE types_no int;
DECLARE rowcount int;

SET cat_no = (select category_no from view_projects where id = project_no);
SET subcat_no = (select subcategory_no from view_projects where id = project_no);
SET types_no = (select type_no from view_projects where id = project_no);
select SQL_CALC_FOUND_ROWS * from view_projects where id in (
SELECT  p.id
FROM   view_projects p
LEFT JOIN gives g ON p.id = g.projectId 
where p.category_no = cat_no
and p.subcategory_no = subcat_no
and p.type_no = types_no
and p.id != project_no
and p.project_status != 'pending'
and p.project_status != 'complete'
GROUP  BY p.id,p.project_cost, p.project_end_date
order by  p.project_end_date, (p.project_cost/sum(g.donationAmount))*100 asc, p.project_end_date desc
);
#and p.id = project_no;


set rowcount = (SELECT FOUND_ROWS());
if (rowcount < 1) THEN
select SQL_CALC_FOUND_ROWS * from view_projects where id in (
SELECT  p.id
FROM   view_projects p
LEFT JOIN gives g ON p.id = g.projectId 
where p.category_no = cat_no
and p.type_no = types_no
and p.id != project_no
and p.project_status != 'pending'
and p.project_status != 'complete'
GROUP  BY p.id,p.project_cost, p.project_end_date
order by  p.project_end_date, (p.project_cost/sum(g.donationAmount))*100 asc, p.project_end_date desc
);
END IF;

END$$

DELIMITER ;