SELECT 
  `update`.`id`, "project" as `source.type`, `project`.`id` as `source.id`, `project`.`project_name` as `source.name`, `project`.`featured_image_url` as `source.image`, `update`.`message`, `update`.`mediaType`, `update`.`mediaUrl`, `update`.`createdAt`, 
  `user`.`id` AS `user.id`, `user`.`firstName` AS `user.firstName`, `user`.`lastName` AS `user.lastName`, `user`.`image` AS `user.image`, `user`.`isProjectLeader` as `user.isProjectLeader`, `user`.`isCompanion` as `user.isCompanion`
FROM 
  `updates` AS `update`
LEFT JOIN `projects` as `project` ON `update`.`projectId` = `project`.`id`
LEFT OUTER JOIN `view_users` AS `user` ON `update`.`userId` = `user`.`id`
WHERE `update`.`projectId` = :projectId
ORDER BY `update`.`createdAt` DESC
LIMIT :limit
OFFSET :offset;