SELECT 
  `update`.`id`, "project" as `source.type`, `project`.`id` as `source.id`, `project`.`project_name` as `source.name`, `project`.`featured_image_url` as `source.image`, `update`.`message`, `update`.`mediaType`, `update`.`mediaUrl`, `update`.`createdAt`, 
  `user`.`id` AS `user.id`, `user`.`firstName` AS `user.firstName`, `user`.`lastName` AS `user.lastName`, `user`.`image` AS `user.image`, `user`.`isProjectLeader` as `user.isProjectLeader`, `user`.`isCompanion` as `user.isCompanion`
FROM
  `updates` AS `update`
LEFT JOIN `projects` as `project` ON `update`.`projectId` = `project`.`id`
LEFT OUTER JOIN `view_users` AS `user` ON `update`.`userId` = `user`.`id`
WHERE `update`.`userId` = :userId
UNION ALL
SELECT 
  `organization_update`.`id`, "organization" as `source.type`, `organization`.`id` as `source.id`, `organization`.`name` as `source.name`, NULL as `source.image`, `organization_update`.`message`, `organization_update`.`mediaType`, `organization_update`.`mediaUrl`, `organization_update`.`createdAt`, 
  `user`.`id` AS `user.id`, `user`.`firstName` AS `user.firstName`, `user`.`lastName` AS `user.lastName`, `user`.`image` AS `user.image`, `user`.`isProjectLeader` as `user.isProjectLeader`, `user`.`isCompanion` as `user.isCompanion`
FROM 
  `organization_updates` AS `organization_update`
LEFT JOIN `organizations` as `organization` ON `organization_update`.`organizationId` = `organization`.`id`
LEFT OUTER JOIN `view_users` AS `user` ON `organization_update`.`userId` = `user`.`id`
WHERE `organization_update`.`userId` = :userId
ORDER BY `createdAt` DESC
LIMIT :limit
OFFSET :offset;